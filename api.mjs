export default {
    async GetQueue({ homey, query }){
        return await homey.app.persistOrLoadQueue(true);
    },
    async DeleteQueue({ homey, query }){
        return await homey.app.persistOrLoadQueue(false, false, query.id);
    },
    async SetQueue({ homey, body }){
        return await homey.app.runAction(body.date, body.time, body.message, body.recipient, body.category);
    }
};