'use strict';

const ACTION_KEY    = 'action';
const DELAY_KEY     = 'delay';
const ID_KEY        = 'id';
const INTERVAL_KEY  = 'interval';

const ACTION_VALUE_REPEAT   = 'REPEAT';
const ACTION_VALUE_START    = 'START';
const ACTION_VALUE_STOP     = 'STOP';

const idMap = new Map();

self.onmessage =
event =>
{
    const notify = () => postMessage({ id });
    const startDelay =
    callback =>
    idMap.set
    (
        id,
        setTimeout
        (
            () =>
            {
                callback();
                notify();
            },
            data[DELAY_KEY],
        ),
    );
    const { data } = event;
    const id = data[ID_KEY];
    switch (data[ACTION_KEY])
    {
    case ACTION_VALUE_START:
        startDelay(() => idMap.delete(id));
        break;
    case ACTION_VALUE_REPEAT:
        startDelay(() => idMap.set(id, setInterval(notify, data[INTERVAL_KEY])));
        break;
    case ACTION_VALUE_STOP:
        {
            const nativeId = idMap.get(id);
            idMap.delete(id);
            clearTimeout(nativeId);
        }
        break;
    }
};
