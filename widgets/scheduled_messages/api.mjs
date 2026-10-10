import { DateTime, Info } from 'luxon';

export default {
    async getMessages({ homey, query }) {
        const timeZone = homey.clock.getTimezone();
        const locale = homey.i18n.getLanguage();
        const today = DateTime.local({ zone: timeZone }).startOf('day');
        const maxItems = Math.max(1, Number(query.maxItems) || 5);
        const category = (query.category || '').trim().toLowerCase();
        const expandRecurring = query.expandRecurring !== 'false';

        const jobs = homey.app.queue.filter((job) => !category || String(job.category).toLowerCase() === category);

        const weekdays = Info.weekdays('short', { locale });

        // Recurring messages are a single job in the queue, optionally expand them into their upcoming occurrences
        const occurrences = [];
        for (const job of jobs) {
            const count = expandRecurring ? maxItems : 1;
            let scheduled = job.scheduledDateTime;

            for (let i = 0; i < count && scheduled; i++) {
                occurrences.push({ job, scheduled });
                scheduled = job.recurrence ? homey.app.getNextOccurrence(job.recurrence, scheduled) : null;
            }
        }

        occurrences.sort((a, b) => a.scheduled - b.scheduled);

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
            items: occurrences.slice(0, maxItems).map(({ job, scheduled: occurrence }) => {
                const scheduled = occurrence.setZone(timeZone).setLocale(locale);
                const daysAway = Math.round(scheduled.startOf('day').diff(today, 'days').days);

                let day;
                if (daysAway === 0) day = homey.__('widget.today');
                else if (daysAway === 1) day = homey.__('widget.tomorrow');
                else if (daysAway < 7) day = scheduled.toFormat('cccc');
                else day = scheduled.toFormat('ccc d LLL');

                return {
                    id: job.id,
                    key: `${job.id}_${scheduled.toMillis()}`,
                    timestamp: scheduled.toMillis(),
                    message: job.message,
                    recipient: job.recipient === 'Unknown recipient' ? '' : job.recipient,
                    category: job.category === 'None' ? '' : job.category,
                    day,
                    time: scheduled.toFormat('HH:mm'),
                    date: scheduled.toFormat('cccc d LLLL yyyy, HH:mm'),
                    repeat: job.recurrence ? homey.__(`widget.repeat.${job.recurrence.repeat}`) : '',
                    repeatDays: job.recurrence && job.recurrence.days ? job.recurrence.days.map((weekday) => weekdays[weekday - 1]).join(', ') : ''
                };
            })
        };
    },

    async skipOccurrence({ homey, params, body }) {
        homey.app.skipOccurrence(params.id, body.timestamp);
        return true;
    },

    async deleteMessage({ homey, params }) {
        // Only delete by exact id, persistOrLoadQueue would otherwise treat the value as a category
        if (!homey.app.queue.some((job) => job.id === params.id)) {
            throw new Error('Message not found');
        }

        homey.app.persistOrLoadQueue(false, false, params.id);
        return true;
    }
};
