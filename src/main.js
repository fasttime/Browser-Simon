/* global art */

(function ()
{
    'use strict';
    
    // Timer //
    
    var timerDataMap = new Map();
    var timerWorker;
    
    var lastTimerId;
    
    function newTimerId()
    {
        do
            lastTimerId = lastTimerId + 1 & 0x7FFFFFFF || 1;
        while (timerDataMap.has(lastTimerId));
        return lastTimerId;
    }
    
    function repeatTimer(callback, delay, interval)
    {
        var id = newTimerId();
        timerDataMap.set(id, { callback: callback, once: false });
        timerWorker.postMessage(
            { 'action': 'REPEAT', 'id': id, 'delay': delay, 'interval': interval }
        );
        return id;
    }
    
    function startTimer(callback, delay)
    {
        var id = newTimerId();
        timerDataMap.set(id, { callback: callback, once: true });
        timerWorker.postMessage({ 'action': 'START', 'id': id, 'delay': delay });
        return id;
    }
    
    function stopTimer(id)
    {
        if (timerDataMap.delete(id))
            timerWorker.postMessage({ 'action': 'STOP', 'id': id });
    }
    
    (function ()
    {
        var script =
            'var idMap=new Map;' +
            'onmessage=' +
                'function(event)' +
                '{' +
                    'function notify()' +
                    '{' +
                        'postMessage({id})' +
                    '}' +
                    'function startDelay(callback)' +
                    '{' +
                        'idMap.set(id,setTimeout(function(){callback();notify()},data.delay))' +
                    '}' +
                    'var data=event.data,id=data.id;' +
                    'switch(data.action)' +
                    '{' +
                    'case"START":' +
                        'startDelay(function(){idMap.delete(id)});' +
                        'break;' +
                    'case"REPEAT":' +
                        'startDelay(function(){idMap.set(id,setInterval(notify,data.interval))});' +
                        'break;' +
                    'case"STOP":' +
                        'var nativeId=idMap.get(id);' +
                        'idMap.delete(id);' +
                        'clearTimeout(nativeId);' +
                        'break;' +
                    '}' +
                '}';
        var blob = new Blob([script]);
        var strUrl = URL.createObjectURL(blob);
        timerWorker = new Worker(strUrl);
    }
    )();
    
    timerWorker.onmessage =
        function (event)
        {
            var id = event.data.id;
            var timerData = timerDataMap.get(id);
            if (timerData)
            {
                var callback = timerData.callback;
                if (timerData.once)
                    timerDataMap.delete(id);
                callback();
            }
        };
    
    // Task //
    
    var tasks = new Set();
    
    function Task(job)
    {
        this.job = job;
        tasks.add(this);
    }
    
    Task.create =
        function (job)
        {
            var task = new Task(job);
            return task;
        };
    
    Task.doAll =
        function ()
        {
            tasks.forEach(
                function (task)
                {
                    task.do();
                }
            );
        };
    
    Task.prototype.do =
        function ()
        {
            var job = this.job;
            if (job)
            {
                stopTimer(this.timerId);
                delete this.timerId;
                this.job = void 0;
                tasks.delete(this);
                job();
            }
        };
    
    Task.prototype.doAfter =
        function (millisecs)
        {
            var task = this;
            var job = task.job;
            if (job)
            {
                stopTimer(task.timerId);
                task.timerId =
                    startTimer(
                        function ()
                        {
                            task.do();
                        },
                        millisecs
                    );
            }
        };
    
    // Square Wave Beep //
    
    var audioCtx = new (window.AudioContext || window.webkitAudioContext);
    
    var stopBeepTask = null;
    
    function startBeep(frequency)
    {
        if (stopBeepTask)
            stopBeepTask.do();
        var oscillator = audioCtx.createOscillator();
        oscillator.connect(audioCtx.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'square';
        oscillator.start();
        stopBeepTask =
            Task.create(
                function ()
                {
                    oscillator.disconnect();
                    stopBeepTask = null;
                }
            );
        return oscillator;
    }
    
    function stopBeep(oscillator, millisecs)
    {
        oscillator.stop(audioCtx.currentTime + millisecs / 1000);
    }
    
    // Simon //
    
    var roundSpan;
    var statusBlock;
    var tileBoard;
    
    var boardReady = false;
    var releaseTileTask = null;
    var seqIndex;
    var sequence;
    
    function gameOver()
    {
        startBeep(42);
        setBoardStatus(false, 'Game over', '#A33');
        Task.create(Task.doAll).doAfter(1500);
    }
    
    function handleOffEvents()
    {
        if (releaseTileTask)
        {
            releaseTileTask.do();
            if (seqIndex < sequence.length)
                startWasteOfTime();
            else
                nextRound();
        }
    }
    
    function handleOnEvents(evt)
    {
        if (boardReady && !releaseTileTask)
        {
            Task.doAll();
            var classList = this.classList;
            classList.add('down');
            if (evt.type === 'mousedown') // no transition on touch
                classList.add('smooth');
            var expectedTile = sequence[seqIndex++];
            if (this === expectedTile)
            {
                var frequency = this.dataset.frequency;
                var oscillator = startBeep(frequency);
                releaseTileTask =
                    Task.create(
                        function ()
                        {
                            classList.remove('down', 'smooth');
                            stopBeep(oscillator, 200);
                            releaseTileTask = null;
                        }
                    );
            }
            else
            {
                Task.create(
                    function ()
                    {
                        classList.remove('down');
                    }
                );
                gameOver();
            }
        }
        evt.preventDefault();
    }

    function handleStartButtonClick()
    {
        Task.doAll();
        sequence = [];
        nextRound();
    }

    function init()
    {
        document.title = 'Browser Simon';
        art(document.head, art('META', { content: 'initial-scale=1', name: 'viewport' }));
        art(
            document.documentElement,
            art.on('mouseup', handleOffEvents),
            art.on('touchend', handleOffEvents)
        );
        
        var header =
            art(
                'H1',
                {
                    style: { font: 'bold 28px/100% Georgia', margin: '28px 0', textAlign: 'center' }
                },
                art('SPAN', { style: { color: '#49F', letterSpacing: '1px' } }, 'BROWSER'),
                art('BR'),
                art('SPAN', { style: { fontSize: '150%' } }, 'sımon')
            );
        
        tileBoard = art('DIV');
        var gameBoard =
            art(
                'DIV',
                { style: { position: 'relative',  width: '300px', height: '300px' } },
                tileBoard
            );
        art.css(
            '.tile',
            {
                'box-shadow': '5px 5px 2.5px #ABABAB',
                position: 'absolute',
                width: '145px',
                height: '145px',
            }
        );
        art.css('.down', { margin: '3px 0 0 3px' });
        art.css(
            '.lit,.smooth',
            { transition: 'background 120ms ease, box-shadow 120ms ease, margin 120ms ease' }
        );
        art.css('.ready *', { cursor: 'pointer' });
        var tileInfos =
        [
            {
                name:       'green',
                frequency:  415.305,
                background: '#DBFFBD',
                lit:        '#9F4',
                shadow:     '#67AB2E',
            },
            {
                name:       'red',
                frequency:  311.127,
                background: '#FFBDBD',
                lit:        '#F44',
                shadow:     '#AB2E2E',
            },
            {
                name:       'yellow',
                frequency:  246.942,
                background: '#FFFFBD',
                lit:        '#FF4',
                shadow:     '#ABAB2E',
            },
            {
                name:       'blue',
                frequency:  207.652,
                background: '#BDDBFF',
                lit:        '#49F',
                shadow:     '#2E67AB',
            },
        ];
        var keyframesRuleObj = { };
        tileInfos.forEach(
            function (tileInfo, index)
            {
                var name = tileInfo.name;
                var tile =
                    art(
                        'DIV',
                        { className: 'tile ' + name, dataset: { frequency: tileInfo.frequency } },
                        art.on('mousedown', handleOnEvents),
                        art.on('touchstart', handleOnEvents),
                        art.on('mouseout', handleOffEvents)
                    );
                var borderRadii = [0, 0, 0, 0];
                var circularIndex = index ^ index >> 1;
                borderRadii[circularIndex] = '145px';
                var borderRadius = borderRadii.join(' ');
                var background = tileInfo.background;
                var lit = tileInfo.lit;
                var shadow = tileInfo.shadow;
                art.css(
                    '.' + name,
                    {
                        background: background,
                        'border-radius': borderRadius,
                        left: 150 * (index & 1) + 'px',
                        top: 150 * (index >> 1) + 'px'
                    }
                );
                art.css(
                    '.down.' + name,
                    { background: lit, 'box-shadow': '2px 2px 2.5px ' + shadow }
                );
                art.css(
                    '.lit.' + name,
                    { background: lit, 'box-shadow': '5px 5px 2.5px ' + shadow }
                );
                art(tileBoard, tile);
                keyframesRuleObj[25 * circularIndex + '%'] = { color: lit };
            }
        );
        keyframesRuleObj['100%'] = keyframesRuleObj['0%'];
        art.css.keyframes('start', keyframesRuleObj);
        
        var startButton =
            art('DIV', { className: 'start' }, 'Start', art.on('click', handleStartButtonClick));
        var startLayer =
            art(
                'DIV',
                { className: 'startLayer' },
                {
                    style:
                    {
                        background: '#888',
                        borderWidth: '1px',
                        position: 'absolute',
                        left: '100px',
                        top: '100px',
                        width: '100px',
                        height: '100px',
                    }
                },
                startButton
            );
        art(gameBoard, startLayer);
        art.css(
            '.start',
            {
                'align-items': 'center',
                background: '#B0C4DE',
                'border-width': '2px',
                color: '#434A54',
                cursor: 'pointer',
                display: 'flex',
                font: 'bold 20px Verdana',
                'justify-content': 'center',
                'letter-spacing': '1px',
                margin: '3px',
                width: '92px',
                height: '92px',
            }
        );
        art.css(
            '.start:active',
            {
                'animation-duration': '1.5s',
                'animation-iteration-count': 'infinite',
                'animation-name': 'start',
                'border-left-color': '#AAA',
                'border-right-color': '#DDD',
                'border-top-color': '#AAA',
                'border-bottom-color': '#DDD',
            }
        );
        art.css(
            '.start,.startLayer',
            {
                'border-radius': '100%',
                'border-style': 'solid',
                'border-left-color': '#DDD',
                'border-right-color': '#AAA',
                'border-top-color': '#DDD',
                'border-bottom-color': '#AAA',
                'box-sizing': 'border-box',
            }
        );
        
        roundSpan = art('SPAN', '—');
        statusBlock = art('H2', { style: { textAlign: 'center' } }, 'Hello');
        var footer =
            art(
                'FOOTER',
                {
                    style:
                    {
                        display: 'table',
                        margin: '18px 0',
                        tableLayout: 'fixed',
                        whiteSpace: 'nowrap',
                        width: '100%',
                    }
                },
                art('H2', { style: { overflowX: 'auto' } }, 'Round: ', roundSpan),
                statusBlock
            );
        art.css('h2', { display: 'table-cell', font: '24px Verdana' });
        
        art(
            document.body,
            {
                style:
                {
                    color: '#33A',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                    MozUserSelect: 'none',
                    WebkitUserSelect: 'none',
                }
            },
            art('DIV', { style: { margin: '0 auto', width: '300px' } }, header, gameBoard, footer)
        );
    }
    
    function nextRound()
    {
        function callback()
        {
            if (seqIndex < round)
            {
                var tile = sequence[seqIndex++];
                var frequency = tile.dataset.frequency;
                var oscillator = startBeep(frequency);
                stopBeep(oscillator, interval - 50);
                var classList = tile.classList;
                classList.add('lit');
                Task.create(
                    function ()
                    {
                        classList.remove('lit');
                    }
                ).doAfter(interval - 100);
            }
            else
                boardReadyTask.do();
        }
        
        seqIndex = 0;
        setBoardStatus(false, 'Look', '');
        sequence.push(randomTile());
        var round = sequence.length;
        roundSpan.textContent = round;
        var interval = round > 13 ? 270 : round > 5 ? 370 : 470;
        var timer = repeatTimer(callback, 800, interval);
        var boardReadyTask =
            Task.create(
                function ()
                {
                    stopTimer(timer);
                    seqIndex = 0;
                    startWasteOfTime();
                    setBoardStatus(true, 'Play', '');
                }
            );
    }
    
    function randomTile()
    {
        var tile = tileBoard.children[Math.random() * 4 ^ 0];
        return tile;
    }
    
    function setBoardStatus(ready, text, color)
    {
        boardReady = ready;
        tileBoard.classList.toggle('ready', ready);
        statusBlock.textContent = text;
        statusBlock.style.color = color;
    }
    
    function startWasteOfTime()
    {
        var timerId =
            startTimer(
                function ()
                {
                    timerId = void 0;
                    var tile = sequence[seqIndex];
                    var classList = tile.classList;
                    classList.add('lit');
                    Task.create(
                        function ()
                        {
                            classList.remove('lit');
                        }
                    );
                    gameOver();
                },
                3000
            );
        Task.create(
            function ()
            {
                stopTimer(timerId);
            }
        );
    }
    
    art(document, art.on('DOMContentLoaded', init));
}
)();
