import { DateTime } from 'luxon';

export default {
    async getMessages({ homey, query }) {
        const timeZone = homey.clock.getTimezone();
        const locale = homey.i18n.getLanguage();
        const today = DateTime.local({ zone: timeZone }).startOf('day');
        const maxItems = Math.max(1, Number(query.maxItems) || 5);
        const category = (query.category || '').trim().toLowerCase();

        const jobs = homey.app.queue.filter((job) => !category || String(job.category).toLowerCase() === category);

        return {
            emptyText: homey.__('widget.empty'),
            moreText: jobs.length > maxItems ? homey.__('widget.more', { count: jobs.length - maxItems }) : '',
            items: jobs.slice(0, maxItems).map((job) => {
                const scheduled = job.scheduledDateTime.setZone(timeZone).setLocale(locale);
                const daysAway = Math.round(scheduled.startOf('day').diff(today, 'days').days);

                let day;
                if (daysAway === 0) day = homey.__('widget.today');
                else if (daysAway === 1) day = homey.__('widget.tomorrow');
                else if (daysAway < 7) day = scheduled.toFormat('cccc');
                else day = scheduled.toFormat('ccc d LLL');

                return {
                    id: job.id,
                    message: job.message,
                    recipient: job.recipient === 'Unknown recipient' ? '' : job.recipient,
                    category: job.category === 'None' ? '' : job.category,
                    day,
                    time: scheduled.toFormat('HH:mm'),
                    repeat: job.recurrence ? homey.__(`widget.repeat.${job.recurrence.repeat}`) : ''
                };
            })
        };
    }
};
