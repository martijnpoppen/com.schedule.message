export default {
    async getMessages({ homey, query }) {
        const maxItems = Math.max(1, Number(query.maxItems) || 5);

        return {
            labels: {
                scheduled: homey.__('widget.labels.scheduled'),
                repeat: homey.__('widget.labels.repeat'),
                recipient: homey.__('widget.labels.recipient'),
                category: homey.__('widget.labels.category'),
                delete: homey.__('widget.labels.delete'),
                deleteRecurring: homey.__('widget.labels.deleteRecurring'),
                skip: homey.__('widget.labels.skip'),
                confirmSkip: homey.__('widget.labels.confirmSkip'),
                confirmDelete: homey.__('widget.labels.confirmDelete'),
                close: homey.__('widget.labels.close')
            },
            emptyText: homey.__('widget.empty'),
            items: homey.app.getMessages({ maxItems, category: query.category, expandRecurring: query.expandRecurring !== 'false' })
        };
    },

    async skipOccurrence({ homey, params, body }) {
        homey.app.skipOccurrence(params.id, body.timestamp);
        return true;
    },

    async deleteMessage({ homey, params }) {
        homey.app.deleteMessage(params.id);
        return true;
    }
};
