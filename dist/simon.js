(function ()
{
    'use strict';
    
    var ART = 'art';
    
    /**
     * Creates or modifies a node.
     *
     * @function art
     *
     * @param target
     * A node, a function returning a node, or a string specifying the type of element to be created
     * using `document.createElement()`.
     *
     * @param {...*} [args]
     * Each additional argument may be a node to be appended to the taget node, a function to be
     * called with the target node as its only argument, an object whose properties shall be
     * assigned to the taget node, or a string of text to be appended to the target node.
     * Note that `null` and `undefined` arguments are simply ignored.
     *
     * @returns {Node} The node specified by the target.
     */
    
    window[ART] =
        function (target)
        {
            var node;
            if (target instanceof Node)
                node = target;
            else if (typeof target === 'function')
                node = target.call(art);
            else
                node = document.createElement(target);
            var argCount = arguments.length;
            for (var index = 0; ++index < argCount;)
            {
                var arg = arguments[index];
                if (arg instanceof Node)
                    node.appendChild(arg);
                else if (arg != null)
                {
                    var type = typeof arg;
                    if (type === 'object')
                        deepAssign(node, arg);
                    else if (type === 'function')
                        arg.call(art, node);
                    else
                        node.appendChild(document.createTextNode(arg));
                }
            }
            return node;
        };
    
    function deepAssign(target, source)
    {
        Object.keys(source).forEach(
            function (name)
            {
                var descriptor = Object.getOwnPropertyDescriptor(source, name);
                if ('value' in descriptor)
                {
                    var value = descriptor.value;
                    if (name in target && typeof value === 'object')
                        deepAssign(target[name], value);
                    else
                        target[name] = value;
                }
                else
                    Object.defineProperty(target, name, descriptor);
            }
        );
    }
}
)();

(function ()
{
    'use strict';
    
    /**
     * Creates a new CSS rule and adds it to the document.
     *
     * @function art.css
     *
     * @requires art.css.js
     *
     * @param {string} selector
     * The selector of the new rule.
     *
     * @param {object} ruleObj
     * A rule definition object mapping style names to their respective values.
     */
    
    art.css =
        function (selector, ruleObj)
        {
            var ruleStr = formatRule(selector, ruleObj);
            addRule(ruleStr);
        };
    
    /**
     * Creates a new CSS keyframes rule and adds it to the document.
     *
     * @function art.css.keyframes
     *
     * @requires art.css.js
     *
     * @param {string} identifier
     * The new keyframes rule identifier.
     *
     * @param {object} ruleObj
     * An object mapping selectors to rule definition objects.
     * Rule definition objects map style names to their respective values.
     */
    
    art.css.keyframes =
        function (identifier, ruleObj)
        {
            var ruleDefs = createRuleDefs(ruleObj, formatRule);
            var ruleStr = '@keyframes ' + identifier + '{' + ruleDefs.join('') + '}';
            addRule(ruleStr);
        };
    
    function addRule(ruleStr)
    {
        if (!styleSheet)
        {
            var style = art('STYLE');
            art(document.head, style);
            styleSheet = style.sheet;
        }
        styleSheet.insertRule(ruleStr, styleSheet.cssRules.length);
    }
    
    function createRuleDefs(ruleObj, callback)
    {
        var ruleDefs =
            Object.keys(ruleObj).map(
                function (ruleName)
                {
                    var ruleValue = ruleObj[ruleName];
                    var ruleDef = callback(ruleName, ruleValue);
                    return ruleDef;
                }
            );
        return ruleDefs;
    }
    
    function formatRule(selector, ruleObj)
    {
        var ruleDefs =
            createRuleDefs(
                ruleObj,
                function (ruleName, ruleValue)
                {
                    var ruleDef = ruleName + ':' + ruleValue;
                    return ruleDef;
                }
            );
        var ruleStr = selector + '{' + ruleDefs.join(';') + '}';
        return ruleStr;
    }
    
    var styleSheet;
}
)();

art.on =
        function (type, listener, useCapture)
        {
            'use strict';
            
            function addEventListener(target)
            {
                function callback(type)
                {
                    target.addEventListener(type, listener, useCapture);
                }
                
                if (Array.isArray(type))
                    type.forEach(callback);
                else
                    callback(type);
            }
            
            return addEventListener;
        };

(function ()
{
    'use strict';
    
    // Timer //
    
    let timerDataMap = new Map();
    let timerWorker;
    
    let lastTimerId;
    
    function newTimerId()
    {
        do
            lastTimerId = lastTimerId + 1 & 0x7FFFFFFF || 1;
        while (timerDataMap.has(lastTimerId));
        return lastTimerId;
    }
    
    function repeatTimer(callback, delay, interval)
    {
        let id = newTimerId();
        timerDataMap.set(id, { callback: callback, once: false });
        timerWorker.postMessage(
            { 'action': 'REPEAT', 'id': id, 'delay': delay, 'interval': interval }
        );
        return id;
    }
    
    function startTimer(callback, delay)
    {
        let id = newTimerId();
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
        let script =
            'let idMap=new Map;' +
            'onmessage=' +
                'event=>' +
                '{' +
                    'let notify=()=>postMessage({id});' +
                    'let startDelay=callback=>' +
                        'idMap.set(id,setTimeout(()=>{callback();notify()},data.delay));' +
                    'let data=event.data,id=data.id;' +
                    'switch(data.action)' +
                    '{' +
                    'case"START":' +
                        'startDelay(()=>idMap.delete(id));' +
                        'break;' +
                    'case"REPEAT":' +
                        'startDelay(()=>idMap.set(id,setInterval(notify,data.interval)));' +
                        'break;' +
                    'case"STOP":' +
                        'let nativeId=idMap.get(id);' +
                        'idMap.delete(id);' +
                        'clearTimeout(nativeId);' +
                        'break;' +
                    '}' +
                '}';
        let blob = new Blob([script]);
        let strUrl = URL.createObjectURL(blob);
        timerWorker = new Worker(strUrl);
    }
    )();
    
    timerWorker.onmessage =
        function (event)
        {
            let id = event.data.id;
            let timerData = timerDataMap.get(id);
            if (timerData)
            {
                let callback = timerData.callback;
                if (timerData.once)
                    timerDataMap.delete(id);
                callback();
            }
        };
    
    // Task //
    
    let tasks = new Set();
    
    function Task(job)
    {
        this.job = job;
        tasks.add(this);
    }
    
    Task.create =
        function (job)
        {
            let task = new Task(job);
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
            let job = this.job;
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
            let task = this;
            let job = task.job;
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
    
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    let stopBeepTask = null;
    
    function startBeep(frequency)
    {
        if (stopBeepTask)
            stopBeepTask.do();
        let oscillator = audioCtx.createOscillator();
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
    
    let roundSpan;
    let statusBlock;
    let tileBoard;
    
    let boardReady = false;
    let releaseTileTask = null;
    let seqIndex;
    let sequence;
    
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
            let classList = this.classList;
            classList.add('down');
            if (evt.type === 'mousedown') // no transition on touch
                classList.add('smooth');
            let expectedTile = sequence[seqIndex++];
            if (this === expectedTile)
            {
                let frequency = this.dataset.frequency;
                let oscillator = startBeep(frequency);
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
        
        let header =
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
        let gameBoard =
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
        let tileInfos =
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
        let keyframesRuleObj = { };
        tileInfos.forEach(
            function (tileInfo, index)
            {
                let name = tileInfo.name;
                let tile =
                    art(
                        'DIV',
                        { className: 'tile ' + name, dataset: { frequency: tileInfo.frequency } },
                        art.on('mousedown', handleOnEvents),
                        art.on('touchstart', handleOnEvents),
                        art.on('mouseout', handleOffEvents)
                    );
                let borderRadii = [0, 0, 0, 0];
                let circularIndex = index ^ index >> 1;
                borderRadii[circularIndex] = '145px';
                let borderRadius = borderRadii.join(' ');
                let background = tileInfo.background;
                let lit = tileInfo.lit;
                let shadow = tileInfo.shadow;
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
        
        let startButton =
            art('DIV', { className: 'start' }, 'Start', art.on('click', handleStartButtonClick));
        let startLayer =
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
                'animation': 'start 1.5s infinite',
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
        let footer =
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
                let tile = sequence[seqIndex++];
                let frequency = tile.dataset.frequency;
                let oscillator = startBeep(frequency);
                stopBeep(oscillator, interval - 50);
                let classList = tile.classList;
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
        let round = sequence.length;
        roundSpan.textContent = round;
        let interval = round > 13 ? 270 : round > 5 ? 370 : 470;
        let timer = repeatTimer(callback, 800, interval);
        let boardReadyTask =
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
        let tile = tileBoard.children[Math.random() * 4 ^ 0];
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
        let timerId =
            startTimer(
                function ()
                {
                    timerId = void 0;
                    let tile = sequence[seqIndex];
                    let classList = tile.classList;
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
