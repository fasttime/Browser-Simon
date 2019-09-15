(function () {
    'use strict';

    (function ()
    {

        var _Object = Object;

        var art =
        window.art =
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
            _Object.keys(source).forEach
            (
                function (name)
                {
                    var descriptor = _Object.getOwnPropertyDescriptor(source, name);
                    if ('value' in descriptor)
                    {
                        var value = descriptor.value;
                        if (name in target && typeof value === 'object')
                            deepAssign(target[name], value);
                        else
                            target[name] = value;
                    }
                    else
                        _Object.defineProperty(target, name, descriptor);
                }
            );
        }

        art.on =
        function (type, listener, useCapture)
        {
            var processEventListener =
            createProcessEventListener(type, listener, useCapture, 'addEventListener');
            return processEventListener;
        };

        function createProcessEventListener(type, listener, useCapture, methodName)
        {
            function processEventListener(target)
            {
                function callback(thisType)
                {
                    target[methodName](thisType, listener, useCapture);
                }

                if (Array.isArray(type))
                    type.forEach(callback);
                else
                    callback(type);
            }

            return processEventListener;
        }

        art.css =
        function (selectors, ruleObj)
        {
            var ruleStr = formatRule(selectors, ruleObj);
            addRule(ruleStr);
        };

        art.css.keyframes =
        (function ()
        {
            var ruleStrBase;
            var keyframes;
            if ('KEYFRAME_RULE' in CSSRule)
                ruleStrBase = '@';
            else if ('WEBKIT_KEYFRAME_RULE' in CSSRule)
                ruleStrBase = '@-webkit-';
            else
            {
                keyframes =
                function (identifier, ruleObjMap) // eslint-disable-line no-unused-vars
                {
                    return false;
                };
                return keyframes;
            }
            ruleStrBase += 'keyframes ';
            keyframes =
            function (identifier, ruleObjMap)
            {
                var ruleDefs = createRuleDefs(ruleObjMap, formatRule);
                var ruleStr = ruleStrBase + identifier + '{' + ruleDefs.join('') + '}';
                addRule(ruleStr);
                return true;
            };
            return keyframes;
        }
        )();

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
            _Object.keys(ruleObj).map
            (
                function (ruleName)
                {
                    var ruleValue = ruleObj[ruleName];
                    var ruleDef = callback(ruleName, ruleValue);
                    return ruleDef;
                }
            );
            return ruleDefs;
        }

        function formatRule(selectors, ruleObj)
        {
            var ruleDefs =
            createRuleDefs
            (
                ruleObj,
                function (ruleName, ruleValue)
                {
                    var ruleDef = ruleName + ':' + ruleValue;
                    return ruleDef;
                }
            );
            var ruleStr = selectors + '{' + ruleDefs.join(';') + '}';
            return ruleStr;
        }

        var styleSheet;
    }
    )();

    var WORKER_SRC = "'use strict';const b=new Map;self.onmessage=d=>{const f=()=>postMessage({id:a}),e=g=>b.set(a,setTimeout(()=>{g();postMessage({id:a})},c.delay)),{data:c}=d,a=c.id;switch(c.action){case \"START\":e(()=>b.delete(a));break;case \"REPEAT\":e(()=>b.set(a,setInterval(f,c.interval)));break;case \"STOP\":d=b.get(a),b.delete(a),clearTimeout(d)}};\n";

    // Timer //

    const ACTION_KEY    = 'action';
    const DELAY_KEY     = 'delay';
    const ID_KEY        = 'id';
    const INTERVAL_KEY  = 'interval';

    const ACTION_VALUE_REPEAT   = 'REPEAT';
    const ACTION_VALUE_START    = 'START';
    const ACTION_VALUE_STOP     = 'STOP';

    const timerDataMap = new Map();
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
        const id = newTimerId();
        timerDataMap.set(id, { callback, once: false });
        timerWorker.postMessage
        (
            {
                [ACTION_KEY]: ACTION_VALUE_REPEAT,
                [ID_KEY]: id,
                [DELAY_KEY]: delay,
                [INTERVAL_KEY]: interval,
            },
        );
        return id;
    }

    function startTimer(callback, delay)
    {
        const id = newTimerId();
        timerDataMap.set(id, { callback, once: true });
        timerWorker.postMessage({ [ACTION_KEY]: ACTION_VALUE_START, [ID_KEY]: id, [DELAY_KEY]: delay });
        return id;
    }

    function stopTimer(id)
    {
        if (timerDataMap.delete(id))
            timerWorker.postMessage({ [ACTION_KEY]: ACTION_VALUE_STOP, [ID_KEY]: id });
    }

    {
        const blob = new Blob([WORKER_SRC]);
        const strUrl = URL.createObjectURL(blob);
        timerWorker = new Worker(strUrl);
    }

    timerWorker.onmessage =
    event =>
    {
        const { id } = event.data;
        const timerData = timerDataMap.get(id);
        if (timerData)
        {
            const { callback } = timerData;
            if (timerData.once)
                timerDataMap.delete(id);
            callback();
        }
    };

    // Task //

    const tasks = new Set();

    class Task
    {
        constructor(job)
        {
            this.job = job;
            tasks.add(this);
        }

        static create(job)
        {
            const task = new Task(job);
            return task;
        }

        static doAll()
        {
            tasks.forEach
            (
                task =>
                {
                    task.do();
                },
            );
        }

        do()
        {
            const { job } = this;
            if (job)
            {
                stopTimer(this.timerId);
                delete this.timerId;
                this.job = undefined;
                tasks.delete(this);
                job();
            }
        }

        doAfter(millisecs)
        {
            const task = this;
            const { job } = task;
            if (job)
            {
                stopTimer(task.timerId);
                task.timerId =
                startTimer
                (
                    () =>
                    {
                        task.do();
                    },
                    millisecs,
                );
            }
        }
    }

    // Square Wave Beep //

    let audioCtx = null;
    let stopBeepTask = null;

    function createOscillator()
    {
        const oscillator = audioCtx.createOscillator();
        return oscillator;
    }

    function initBeep()
    {
        if (!audioCtx)
        {
            const propName = 'AudioContext' in window ? 'AudioContext' : 'webkitAudioContext';
            audioCtx = new window[propName]();
            createOscillator();
        }
    }

    function startBeep(frequency)
    {
        if (stopBeepTask)
            stopBeepTask.do();
        const oscillator = createOscillator();
        oscillator.connect(audioCtx.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'square';
        oscillator.start();
        stopBeepTask =
        Task.create
        (
            () =>
            {
                oscillator.disconnect();
                stopBeepTask = null;
            },
        );
        return oscillator;
    }

    function stopBeep(oscillator, millisecs)
    {
        oscillator.stop(audioCtx.currentTime + millisecs / 1000);
    }

    // Simon //

    const { art } = window;

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
            const { classList } = this;
            classList.add('down');
            if (evt.type === 'mousedown') // no transition on touch
                classList.add('smooth');
            const expectedTile = sequence[seqIndex++];
            if (this === expectedTile)
            {
                const { frequency } = this.dataset;
                const oscillator = startBeep(frequency);
                releaseTileTask =
                Task.create
                (
                    () =>
                    {
                        classList.remove('down', 'smooth');
                        stopBeep(oscillator, 200);
                        releaseTileTask = null;
                    },
                );
            }
            else
            {
                Task.create
                (
                    () =>
                    {
                        classList.remove('down');
                    },
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
        initBeep();
    }

    function init()
    {
        const document = this;
        document.title = 'Browser Simon';
        art
        (
            document.head,
            art('META', { content: 'user-scalable=no, width=device-width', name: 'viewport' }),
        );
        art
        (
            document.documentElement,
            art.on('mouseup', handleOffEvents),
            art.on('touchend', handleOffEvents),
        );
        const header =
        art
        (
            'H1',
            { style: { font: 'bold 28px/100% Georgia', margin: '28px 0', textAlign: 'center' } },
            art('SPAN', { style: { color: '#49F', letterSpacing: '1px' } }, 'BROWSER'),
            art('BR'),
            art('SPAN', { style: { fontSize: '150%' } }, 'sımon'),
        );
        tileBoard = art('DIV');
        const gameBoard =
        art
        ('DIV', { style: { position: 'relative',  width: '300px', height: '300px' } }, tileBoard);
        art.css
        (
            '.tile',
            {
                'box-shadow': '5px 5px 2.5px #ABABAB',
                'position': 'absolute',
                'width': '145px',
                'height': '145px',
            },
        );
        art.css('.down', { margin: '3px 0 0 3px' });
        art.css
        (
            '.lit,.smooth',
            { transition: 'background 120ms ease, box-shadow 120ms ease, margin 120ms ease' },
        );
        art.css('.ready *', { cursor: 'pointer' });
        const tileInfos =
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
        const keyframesRuleObj = { };
        tileInfos.forEach
        (
            (tileInfo, index) =>
            {
                const { background, frequency, lit, name, shadow } = tileInfo;
                const tile =
                art
                (
                    'DIV',
                    { className: `tile ${name}`, dataset: { frequency } },
                    art.on('mousedown', handleOnEvents),
                    art.on('touchstart', handleOnEvents),
                    art.on('mouseout', handleOffEvents),
                );
                const borderRadii = [0, 0, 0, 0];
                const circularIndex = index ^ index >> 1;
                borderRadii[circularIndex] = '145px';
                const borderRadius = borderRadii.join(' ');
                art.css
                (
                    `.${name}`,
                    {
                        background,
                        'border-radius': borderRadius,
                        'left': `${150 * (index & 1)}px`,
                        'top': `${150 * (index >> 1)}px`,
                    },
                );
                art.css
                (`.down.${name}`, { 'background': lit, 'box-shadow': `2px 2px 2.5px ${shadow}` });
                art.css
                (`.lit.${name}`, { 'background': lit, 'box-shadow': `5px 5px 2.5px ${shadow}` });
                art(tileBoard, tile);
                keyframesRuleObj[`${25 * circularIndex}%`] = { color: lit };
            },
        );
        keyframesRuleObj['100%'] = keyframesRuleObj['0%'];
        art.css.keyframes('start', keyframesRuleObj);
        const startLabel =
        art
        (
            'DIV',
            {
                className: 'round',
                style:
                {
                    alignItems: 'center',
                    background: '#B0C4DE',
                    flexGrow: '1',
                    font: 'bold 20px Verdana',
                    justifyContent: 'center',
                    letterSpacing: '1px',
                },
            },
            'Start',
        );
        const startButton =
        art
        (
            'DIV',
            {
                className: 'round startButton',
                style:
                {
                    boxShadow: '0 0 0 3px #888',
                    color: '#434A54',
                    cursor: 'pointer',
                    flexGrow: '1',
                    padding: '2px',
                },
            },
            art.on('click', handleStartButtonClick),
            startLabel,
        );
        const startLayer =
        art
        (
            'DIV',
            { className: 'round startLayer' },
            {
                style:
                {
                    padding: '4px',
                    position: 'absolute',
                    left: '100px',
                    top: '100px',
                    width: '100px',
                    height: '100px',
                },
            },
            startButton,
        );
        art(gameBoard, startLayer);
        art.css
        (
            '.startButton,.startLayer',
            { 'background': 'linear-gradient(135deg,#DDD,#AAA)' },
        );
        art.css
        (
            '.startButton:active',
            { 'animation': 'start 1.5s infinite', 'background': 'linear-gradient(315deg,#DDD,#AAA)' },
        );
        art.css
        ('.round', { 'border-radius': '100%', 'box-sizing': 'border-box', 'display': 'flex' });
        roundSpan = art('SPAN', '—');
        statusBlock = art('H2', { style: { textAlign: 'center' } }, 'Hello');
        const footer =
        art
        (
            'FOOTER',
            {
                style:
                {
                    display: 'table',
                    margin: '18px 0',
                    tableLayout: 'fixed',
                    whiteSpace: 'nowrap',
                    width: '100%',
                },
            },
            art('H2', { style: { overflowX: 'auto' } }, 'Round: ', roundSpan),
            statusBlock,
        );
        art.css('h2', { display: 'table-cell', font: '24px Verdana' });
        art
        (
            document.body,
            {
                style:
                {
                    color: '#33A',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                },
            },
            art
            (
                'DIV',
                { style: { cursor: 'default', margin: '0 auto', width: '300px' } },
                header,
                gameBoard,
                footer,
            ),
        );
    }

    function nextRound()
    {
        function callback()
        {
            if (seqIndex < round)
            {
                const tile = sequence[seqIndex++];
                const { frequency } = tile.dataset;
                const oscillator = startBeep(frequency);
                stopBeep(oscillator, interval - 50);
                const { classList } = tile;
                classList.add('lit');
                Task.create
                (
                    () =>
                    {
                        classList.remove('lit');
                    },
                )
                .doAfter(interval - 100);
            }
            else
                boardReadyTask.do();
        }

        seqIndex = 0;
        setBoardStatus(false, 'Look', '');
        sequence.push(randomTile());
        const round = sequence.length;
        roundSpan.textContent = round;
        const interval = round > 13 ? 270 : round > 5 ? 370 : 470;
        const timerId = repeatTimer(callback, 800, interval);
        const boardReadyTask =
        Task.create
        (
            () =>
            {
                stopTimer(timerId);
                seqIndex = 0;
                startWasteOfTime();
                setBoardStatus(true, 'Play', '');
            },
        );
    }

    function randomTile()
    {
        const tile = tileBoard.children[Math.random() * 4 ^ 0];
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
        startTimer
        (
            () =>
            {
                timerId = undefined;
                const tile = sequence[seqIndex];
                const { classList } = tile;
                classList.add('lit');
                Task.create
                (
                    () =>
                    {
                        classList.remove('lit');
                    },
                );
                gameOver();
            },
            3000,
        );
        Task.create
        (
            () =>
            {
                stopTimer(timerId);
            },
        );
    }

    art(document, art.on('DOMContentLoaded', init));

}());
