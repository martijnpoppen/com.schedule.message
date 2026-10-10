export default {
    async GetQueue({ homey, query }){
        return await homey.app.persistOrLoadQueue(true);
    },
    async DeleteQueue({ homey, query }){
        return await homey.app.persistOrLoadQueue(false, false, query.id);
    },
    async SetQueue({ homey, body }){
        if (body.repeat && body.repeat !== 'none') {
            return await homey.app.runRecurringAction(body.time, body.repeat, body.days, body.message, body.category, body.recipient, body.date);
        }

        return await homey.app.runAction(body.date, body.time, body.message, body.category, body.recipient || undefined);
    }
};
