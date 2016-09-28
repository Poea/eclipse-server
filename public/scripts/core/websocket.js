define([
    'pubsub',
    'vendor/alertify'
], (PubSub, alertify) => {
    function genericConnect(){
        const ws = new WebSocket(`ws://${location.host}`);

        ws.onopen = () => {
            alertify.log('WebSocket connection established');
        }

        ws.onclose = () => {
            alertify.delay(0).closeLogOnClick(true).error('WebSocket connection lost');
        }

        ws.onmessage = (data, flags) => {
            const payload = JSON.parse(data.data);
            console.log(`=> "${payload.subject}" :: ${JSON.stringify(payload.message, null, 2)}`);

            PubSub.publish(payload.subject, payload);
        }

        return ws;
    }

    return {
        genericConnect: genericConnect
    };
});
