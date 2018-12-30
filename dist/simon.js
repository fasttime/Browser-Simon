(function ()
{
    'use strict';

    /**
     * Creates or modifies a node.
     *
     * @function art
     *
     * @param target
     * A node, a function returning a node, or a string specifying the type of element to be created
     * using `document.createElement()`.
     *
     * @param {...*} [arguments]
     * Each additional argument may be a node to be appended to the taget node, a function to be
     * called with the target node as its only argument, an object whose properties shall be
     * assigned to the taget node, or a string of text to be appended to the target node.
     * Note that `null` and `undefined` arguments are simply ignored.
     *
     * @returns {Node} The node specified by the target.
     */

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
        Object.keys(source).forEach
        (
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

    /**
     * Returns a callback that can be used to attach a listener to the target node in a call to
     * {@link art `art()`}.
     * The arguments are the same as in `EventTarget.addEventListener()`, except that the argument
     * `type` may be an array specifying multiple event types.
     *
     * @function art.on
     *
     * @param {string|Array<string>} type
     * A string or array of strings specifing the event types to listen for.
     *
     * @param {Function|EventListener} listener
     * The event handler to associate with the events.
     *
     * @param {boolean=} useCapture
     * `true` to register the events for the capturing phase, or `false` to register the events for
     * the bubbling phase.
     *
     * @returns {Function}
     */

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

    /**
     * Creates a new CSS rule and adds it to the document.
     *
     * @function art.css
     *
     * @param {string} selector
     * The selector of the new rule.
     *
     * @param {Object} ruleObj
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
     * @param {string} identifier
     * The new keyframes rule identifier.
     *
     * @param {Object} ruleObj
     * An object mapping selectors to rule definition objects.
     * Rule definition objects map style names to their respective values.
     *
     * @returns {boolean} `true` on success; otherwise, `false`.
     */

    art.css.keyframes =
    (function ()
    {
        var ruleStrBase;
        var keyframes;
        if (CSSRule.KEYFRAME_RULE)
            ruleStrBase = '@';
        else if (CSSRule.WEBKIT_KEYFRAME_RULE)
            ruleStrBase = '@-webkit-';
        else
        {
            keyframes =
            function (identifier, ruleObj) // eslint-disable-line no-unused-vars
            {
                return false;
            };
            return keyframes;
        }
        ruleStrBase += 'keyframes ';
        keyframes =
        function (identifier, ruleObj)
        {
            var ruleDefs = createRuleDefs(ruleObj, formatRule);
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
        Object.keys(ruleObj).map
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

    function formatRule(selector, ruleObj)
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
        var ruleStr = selector + '{' + ruleDefs.join(';') + '}';
        return ruleStr;
    }

    var styleSheet;
}
)();

(() =>
{
    'use strict';

    // Timer //

    const ACTION_KEY    = 'action';
    const DELAY_KEY     = 'delay';
    const ID_KEY        = 'id';
    const INTERVAL_KEY  = 'interval';

    const ACTION_VALUE_REPEAT   = 'REPAEAT';
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
            }
        );
        return id;
    }

    function startTimer(callback, delay)
    {
        const id = newTimerId();
        timerDataMap.set(id, { callback, once: true });
        timerWorker.postMessage
        ({ [ACTION_KEY]: ACTION_VALUE_START, [ID_KEY]: id, [DELAY_KEY]: delay });
        return id;
    }

    function stopTimer(id)
    {
        if (timerDataMap.delete(id))
            timerWorker.postMessage({ [ACTION_KEY]: ACTION_VALUE_STOP, [ID_KEY]: id });
    }

    {
        const script =
        'let idMap=new Map;' +
        'onmessage=' +
        'event=>' +
        '{' +
            'let notify=()=>postMessage({id});' +
            'let startDelay=' +
            `callback=>idMap.set(id,setTimeout(()=>{callback();notify()},data.${DELAY_KEY}));` +
            `let{data}=event,id=data.${ID_KEY};` +
            `switch(data.${ACTION_KEY})` +
            '{' +
            `case"${ACTION_VALUE_START}":` +
                'startDelay(()=>idMap.delete(id));' +
                'break;' +
            `case"${ACTION_VALUE_REPEAT}":` +
                `startDelay(()=>idMap.set(id,setInterval(notify,data.${INTERVAL_KEY})));` +
                'break;' +
            `case"${ACTION_VALUE_STOP}":` +
                'let nativeId=idMap.get(id);' +
                'idMap.delete(id);' +
                'clearTimeout(nativeId);' +
                'break;' +
            '}' +
        '}';
        const blob = new Blob([script]);
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

    function Task(job)
    {
        this.job = job;
        tasks.add(this);
    }

    Task.create =
    job =>
    {
        const task = new Task(job);
        return task;
    };

    Task.doAll =
    () =>
    {
        tasks.forEach
        (
            task =>
            {
                task.do();
            }
        );
    };

    Task.prototype.do =
    function ()
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
    };

    Task.prototype.doAfter =
    function (millisecs)
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
                millisecs
            );
        }
    };

    // Square Wave Beep //

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    let stopBeepTask = null;

    function startBeep(frequency)
    {
        if (stopBeepTask)
            stopBeepTask.do();
        const oscillator = audioCtx.createOscillator();
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
            }
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
                    }
                );
            }
            else
            {
                Task.create
                (
                    () =>
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
        art
        (
            document.head,
            art('META', { content: 'user-scalable=no, width=device-width', name: 'viewport' })
        );
        art
        (
            document.documentElement,
            art.on('mouseup', handleOffEvents),
            art.on('touchend', handleOffEvents)
        );

        const header =
        art
        (
            'H1',
            { style: { font: 'bold 28px/100% Georgia', margin: '28px 0', textAlign: 'center' } },
            art('SPAN', { style: { color: '#49F', letterSpacing: '1px' } }, 'BROWSER'),
            art('BR'),
            art('SPAN', { style: { fontSize: '150%' } }, 'sımon')
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
                position: 'absolute',
                width: '145px',
                height: '145px',
            }
        );
        art.css('.down', { margin: '3px 0 0 3px' });
        art.css
        (
            '.lit,.smooth',
            { transition: 'background 120ms ease, box-shadow 120ms ease, margin 120ms ease' }
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
                    art.on('mouseout', handleOffEvents)
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
                    }
                );
                art.css
                (`.down.${name}`, { 'background': lit, 'box-shadow': `2px 2px 2.5px ${shadow}` });
                art.css
                (`.lit.${name}`, { 'background': lit, 'box-shadow': `5px 5px 2.5px ${shadow}` });
                art(tileBoard, tile);
                keyframesRuleObj[`${25 * circularIndex}%`] = { color: lit };
            }
        );
        keyframesRuleObj['100%'] = keyframesRuleObj['0%'];
        art.css.keyframes('start', keyframesRuleObj);

        const startButton =
        art('DIV', { className: 'start' }, 'Start', art.on('click', handleStartButtonClick));
        const startLayer =
        art
        (
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
                },
            },
            startButton
        );
        art(gameBoard, startLayer);
        art.css
        (
            '.start',
            {
                'align-items': 'center',
                'background': '#B0C4DE',
                'border-width': '2px',
                'color': '#434A54',
                'cursor': 'pointer',
                'display': 'flex',
                'font': 'bold 20px Verdana',
                'justify-content': 'center',
                'letter-spacing': '1px',
                'margin': '3px',
                'width': '92px',
                'height': '92px',
            }
        );
        art.css
        (
            '.start:active',
            { 'animation': 'start 1.5s infinite', 'border-color': '#AAA #DDD #DDD #AAA' }
        );
        art.css
        (
            '.start,.startLayer',
            {
                'border-color': '#DDD #AAA #AAA #DDD',
                'border-radius': '100%',
                'border-style': 'solid',
                'box-sizing': 'border-box',
            }
        );

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
            statusBlock
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
                    MozUserSelect: 'none',
                    WebkitUserSelect: 'none',
                },
            },
            art
            (
                'DIV',
                { style: { cursor: 'default', margin: '0 auto', width: '300px' } },
                header,
                gameBoard,
                footer
            )
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
                    }
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
        const timer = repeatTimer(callback, 800, interval);
        const boardReadyTask =
        Task.create
        (
            () =>
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
                    }
                );
                gameOver();
            },
            3000
        );
        Task.create
        (
            () =>
            {
                stopTimer(timerId);
            }
        );
    }

    art(document, art.on('DOMContentLoaded', init));
}
)();
