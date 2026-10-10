'use strict';

import HomeyLogger from './lib/logger.mjs';
import fs, { writeFileSync, readFileSync, existsSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import { v4 as uuidv4, validate as isValidUUID } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WEEKDAYS = {
    1: ['1', 'mon', 'monday', 'ma', 'maandag'],
    2: ['2', 'tue', 'tues', 'tuesday', 'di', 'dinsdag'],
    3: ['3', 'wed', 'wednesday', 'wo', 'woensdag'],
    4: ['4', 'thu', 'thur', 'thurs', 'thursday', 'do', 'donderdag'],
    5: ['5', 'fri', 'friday', 'vr', 'vrijdag'],
    6: ['6', 'sat', 'saturday', 'za', 'zaterdag'],
    7: ['7', 'sun', 'sunday', 'zo', 'zondag']
};
const REPEAT_TYPES = ['once', 'daily', 'weekly', 'biweekly'];

class ScheduleMessageApp extends HomeyLogger {
    /**
     * Called when the app is initialized.
     * It logs the initialization message, initializes flow cards,
     * loads or persists the queue, and starts processing the queue.
     * @returns {Promise<void>}
     */
    async onInit() {
        try {
            this.log(`${this.homey.manifest.id} has been initialized`);

            this.queue = [];
            this.triggers = {};

            await this.initFlowCards();
            await this.persistOrLoadQueue(true);
            this.processQueue();
        } catch (error) {
            this.error('Error initializing app:', error);
        }
    }

    /**
     * Loads or persists the queue to a file.
     * If `load` is true, it will load the queue from the file.
     * If `reset` is true, it will reset the queue to an empty array.
     * If `load` is false, it will persist the current queue to the file.
     * @param {boolean} load - Whether to load the queue from the file.
     * @param {boolean} reset - Whether to reset the queue to an empty array.
     * @param {string|null} category - The category to reset the queue for (if applicable).
     * @param {Array} [queue] - The queue to persist if `load` is false.
     */
    persistOrLoadQueue(load = true, reset = false, categoryOrItemId = null) {
        const persistentDir = path.resolve(__dirname, '/userdata/');
        const persistentFile = 'queue.json';
        const persistentPath = path.join(persistentDir, persistentFile);

        if (reset && !load) {
            this.warn('Resetting queue, but not loading. No action taken.');
            return;
        }

        if (load && (reset || !existsSync(persistentPath))) {
            this.log('Queue file does not exist, creating new queue.');

            this.queue = [];

            this.writeQueue(persistentPath);
        } else if (load) {
            this.queue = JSON.parse(readFileSync(persistentPath));
            this.checkQueueForUniqueIds();
            this.hydrateQueue();

            this.log('Queue loaded successfully:', this.queue);
        } else if (!load && categoryOrItemId) {
            if (isValidUUID(categoryOrItemId)) {
                this.log('Resetting queue for item ID:', categoryOrItemId);
                this.queue = this.queue.filter((job) => job.id !== categoryOrItemId);
            } else if (categoryOrItemId === '') {
                this.log('Resetting entire queue as no category or item ID provided.');
                this.queue = [];
            } else {
                this.log('Resetting queue for category:', categoryOrItemId);
                this.queue = categoryOrItemId !== '' ? this.queue.filter((job) => job.category !== categoryOrItemId) : [];
            }

            this.writeQueue(persistentPath);
        } else {
            this.log('Persisting queue to file...');

            this.writeQueue(persistentPath);
        }

        return this.queue;
    }

    /**
     * Writes the queue to disk and notifies listeners (settings page / widget) that it changed.
     * @param {string} persistentPath - The path of the queue file.
     */
    writeQueue(persistentPath) {
        writeFileSync(persistentPath, JSON.stringify(this.queue, null, 2));
        Promise.resolve()
            .then(() => this.homey.api.realtime('queue-updated', null))
            .catch((error) => this.error('Error emitting queue update:', error));
    }

    /**
     * Converts the persisted ISO strings back into Luxon DateTime objects,
     * otherwise loaded jobs can't be compared against the current time.
     */
    hydrateQueue() {
        const timeZone = this.homey.clock.getTimezone();

        this.queue = this.queue
            .map((job) => ({ ...job, scheduledDateTime: DateTime.fromISO(job.scheduledDateTime, { zone: timeZone }) }))
            .filter((job) => {
                if (!job.scheduledDateTime.isValid) this.warn('[hydrateQueue]', 'Removing job with invalid date:', job);
                return job.scheduledDateTime.isValid;
            })
            .sort((a, b) => a.scheduledDateTime - b.scheduledDateTime);
    }

    checkQueueForUniqueIds() {
        // if a item in the this.queue doesn't have a unique id, generate one
        this.queue.forEach((job) => {
            if (!job.id || typeof job.id !== 'string') {
                job.id = uuidv4();
                this.log('[checkQueueForUniqueIds]', 'Generated new unique id for job:', job);
            }
        });
    }

    /**
     * Processes the queue by checking if the scheduled date and time is in the past.
     * If it is, it triggers the scheduled message flow card.
     * It runs every second to check for jobs that need to be executed.
     */
    processQueue() {
        this.log('Starting to process the queue every second', this.queue.length);
        this.homey.setInterval(() => {
            const now = DateTime.local({ zone: this.homey.clock.getTimezone() });

            const dueJobs = this.queue.filter((job) => job.scheduledDateTime <= now);
            if (!dueJobs.length) return;

            for (const job of dueJobs) {
                this.info('⏰ Running job:', job.message, 'recipient:', job.recipient, 'category:', job.category, 'at', job.scheduledDateTime.toISO());

                const tokensAndState = { recipient: job.recipient, message: job.message, category: job.category };
                this.triggers.scheduled_message_trigger.trigger(tokensAndState, tokensAndState).catch((error) => this.error('Error triggering flow:', error));

                // Recurring jobs stay in the queue with their next occurrence, one-off jobs are removed
                const nextDateTime = job.recurrence ? this.getNextOccurrence(job.recurrence, now) : null;

                if (nextDateTime) {
                    this.log('Rescheduling recurring job', job.id, 'to', nextDateTime.toISO());
                    job.scheduledDateTime = nextDateTime;
                } else {
                    this.queue = this.queue.filter((queuedJob) => queuedJob !== job);
                }
            }

            this.queue.sort((a, b) => a.scheduledDateTime - b.scheduledDateTime);
            this.persistOrLoadQueue(false);
        }, 1000);
    }

    // ------- Flow Cards Initialization -------
    /**
     * Initializes flow cards for actions and triggers.
     */
    initFlowCards() {
        this.triggers = {};
        this.initActions();
        this.initConditions();
        this.initTriggers();
    }

    /**
     * Initializes action cards for the app.
     */
    initActions() {
        const set_scheduled_event = this.homey.flow.getActionCard('set_scheduled_event');
        set_scheduled_event.registerRunListener(async (args, state) => {
            this.trace('[Action]', 'set_scheduled_event');

            const { date, time, message, category } = args;

            this.runAction(date, time, message, category);
        });

        const set_scheduled_message = this.homey.flow.getActionCard('set_scheduled_message');
        set_scheduled_message.registerRunListener(async (args, state) => {
            this.trace('[Action]', 'set_scheduled_message');

            const { date, time, recipient, message, category } = args;

            this.runAction(date, time, message, category, recipient);
        });

        const set_scheduled_message_raw = this.homey.flow.getActionCard('set_scheduled_message_raw');
        set_scheduled_message_raw.registerRunListener(async (args, state) => {
            try {
                this.trace('[Action]', 'set_scheduled_message_raw', args);

                let input = args.data || {};
                const { category = 'None' } = args;

                if (args.prefix && args.prefix.length && input.startsWith(args.prefix)) {
                    input = input.slice(args.prefix.length); // Remove the leading prefix
                }

                const pipeCount = (input.match(/\|/g) || []).length;

                if (pipeCount !== 3 && pipeCount !== 2) {
                    this.error('[Action]', 'Invalid data format. Expected 2 or 3 pipes (|) in the input string. 3: date|time|recipient|message or 2: date|time|message');
                    throw new Error('Invalid data format. Expected 2 or 3 pipes (|) in the input string. 3: date|time|recipient|message or 2: date|time|message');
                }

                if (pipeCount === 2) {
                    const [date, time, message] = input.split('|');

                    this.runAction(date, time, message, category);
                }

                if (pipeCount === 3) {
                    const [date, time, recipient, message] = input.split('|');

                    this.runAction(date, time, message, category, recipient);
                }
            } catch (error) {
                if (!error) {
                    throw new Error('[Action]', 'Invalid data format. Please provide data in the format: date|time|recipient|message or date|time|message');
                }

                throw error;
            }
        });

        const set_recurring_message = this.homey.flow.getActionCard('set_recurring_message');
        set_recurring_message.registerRunListener(async (args, state) => {
            this.trace('[Action]', 'set_recurring_message', args);

            const { time, repeat, days, message, recipient, category } = args;

            this.runRecurringAction(time, repeat, days, message, category, recipient);
        });

        const reset_scheduled_messages = this.homey.flow.getActionCard('reset_scheduled_messages');
        reset_scheduled_messages.registerRunListener(async (args, state) => {
            this.trace('[Action]', 'reset_scheduled_messages');

            this.persistOrLoadQueue(false, false, args.category || '');
        });

        const reset_recurring_messages = this.homey.flow.getActionCard('reset_recurring_messages');
        reset_recurring_messages.registerRunListener(async (args, state) => {
            this.trace('[Action]', 'reset_recurring_messages');

            this.removeRecurringMessages(args.category || '');
        });
    }

    /**
     * Removes all recurring messages, optionally only for one category. One-off messages are kept.
     * @param {string} category - The category to remove recurring messages for, empty for all categories.
     */
    removeRecurringMessages(category = '') {
        this.log('Removing recurring messages for category:', category || 'all');

        this.queue = this.queue.filter((job) => !job.recurrence || (category !== '' && job.category !== category));
        this.persistOrLoadQueue(false);

        return this.queue;
    }

    runAction(date, time, message, category, recipient = 'Unknown recipient') {
        try {
            const id = uuidv4();
            const timeZone = this.homey.clock.getTimezone();
            const isoDate = this.formatDateToIso(date);
            const scheduledDateTime = DateTime.fromISO(`${isoDate}T${time}`, { zone: timeZone });

            // check if the scheduled date and time is in the past
            if (scheduledDateTime < DateTime.local({ zone: timeZone })) {
                this.error('Scheduled date and time is in the past. Please provide a future date and time.');
                throw new Error('Scheduled date and time is in the past. Please provide a future date and time.');
            }

            this.log('runAction', { category, recipient, message, isoDate, date, time, timeZone, scheduledDateTime });

            this.queue.push({ id, recipient, message, scheduledDateTime, category });
            this.queue.sort((a, b) => a.scheduledDateTime - b.scheduledDateTime); // Keep sorted
            this.persistOrLoadQueue(false);
        } catch (error) {
            this.error('Error in runAction:', error);
            throw error;
        }
    }

    /**
     * Schedules a message on a time with an optional repeat pattern.
     * @param {string} time - Time in HH:mm.
     * @param {string} repeat - One of once, daily, weekly, biweekly.
     * @param {string|Array} days - Days to run on, e.g. "mon,wed,fri", "1,3,5", "weekdays" or an array of ISO weekdays.
     * @param {string} message - The message.
     * @param {string} category - The category.
     * @param {string} recipient - The recipient.
     * @param {string|null} startDate - Optional date from which the schedule starts.
     */
    runRecurringAction(time, repeat = 'once', days = '', message, category = 'None', recipient = '', startDate = null) {
        try {
            if (!REPEAT_TYPES.includes(repeat)) {
                throw new Error(`Invalid repeat value "${repeat}". Use one of: ${REPEAT_TYPES.join(', ')}`);
            }

            if (!/^\d{1,2}:\d{2}/.test(time || '')) {
                throw new Error('Invalid time format. Please provide a time as HH:mm.');
            }

            const timeZone = this.homey.clock.getTimezone();
            const now = DateTime.local({ zone: timeZone });
            const from = startDate ? DateTime.max(now, DateTime.fromISO(this.formatDateToIso(startDate), { zone: timeZone }).minus({ milliseconds: 1 })) : now;
            const recurrence = { repeat, time: time.slice(0, 5), days: this.parseDays(days) };

            // Find the first occurrence, and use its weekday / week as base when no days are given
            const scheduledDateTime = this.getNextOccurrence(recurrence, from);
            if (!scheduledDateTime) {
                throw new Error('Could not determine the next occurrence for this schedule.');
            }

            if (!recurrence.days.length && (repeat === 'weekly' || repeat === 'biweekly')) {
                recurrence.days = [scheduledDateTime.weekday];
            }

            if (repeat === 'biweekly') {
                recurrence.anchor = scheduledDateTime.startOf('week').toISODate();
            }

            const job = {
                id: uuidv4(),
                recipient: recipient || 'Unknown recipient',
                message,
                scheduledDateTime,
                category: category || 'None'
            };

            if (repeat !== 'once') job.recurrence = recurrence;

            this.log('runRecurringAction', job);

            this.queue.push(job);
            this.queue.sort((a, b) => a.scheduledDateTime - b.scheduledDateTime); // Keep sorted
            this.persistOrLoadQueue(false);

            return job;
        } catch (error) {
            this.error('Error in runRecurringAction:', error);
            throw error;
        }
    }

    /**
     * Parses a days string (e.g. "mon,wed,fri", "1 3 5", "weekdays", "weekend") into ISO weekdays (1 = Monday).
     * @param {string|Array} input
     * @returns {number[]}
     */
    parseDays(input) {
        if (Array.isArray(input)) input = input.join(',');
        if (!input || !String(input).trim()) return [];

        const days = new Set();

        for (const token of String(input).toLowerCase().split(/[\s,;|]+/).filter(Boolean)) {
            if (['weekdays', 'workdays', 'werkdagen', 'doordeweeks'].includes(token)) {
                [1, 2, 3, 4, 5].forEach((day) => days.add(day));
            } else if (['weekend', 'weekends'].includes(token)) {
                [6, 7].forEach((day) => days.add(day));
            } else {
                const day = Object.keys(WEEKDAYS).find((key) => WEEKDAYS[key].includes(token));
                if (!day) throw new Error(`Invalid day "${token}". Use e.g. mon,tue,wed,thu,fri,sat,sun or 1-7 (1 = Monday).`);
                days.add(Number(day));
            }
        }

        return [...days].sort();
    }

    /**
     * Calculates the next occurrence of a recurrence after a given moment.
     * @param {{repeat: string, time: string, days: number[], anchor?: string}} recurrence
     * @param {DateTime} after
     * @returns {DateTime|null}
     */
    getNextOccurrence({ repeat, time, days = [], anchor }, after) {
        const timeZone = this.homey.clock.getTimezone();
        const [hour, minute] = time.split(':').map(Number);
        const anchorWeek = anchor ? DateTime.fromISO(anchor, { zone: timeZone }).startOf('week') : null;

        let day = after.setZone(timeZone).startOf('day');

        // 3 weeks is always enough to find the next day for a (bi)weekly schedule
        for (let i = 0; i <= 21; i++, day = day.plus({ days: 1 })) {
            const candidate = day.set({ hour, minute, second: 0, millisecond: 0 });

            if (candidate <= after) continue;
            if (days.length && !days.includes(candidate.weekday)) continue;

            if (repeat === 'biweekly' && anchorWeek) {
                const weeks = Math.round(candidate.startOf('week').diff(anchorWeek, 'weeks').weeks);
                if (Math.abs(weeks) % 2 !== 0) continue;
            }

            return candidate;
        }

        return null;
    }

    formatDateToIso(input) {
        const formats = ['dd-MM-yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'MMMM d, yyyy', 'd MMMM yyyy'];

        let date;
        for (const format of formats) {
            date = DateTime.fromFormat(input, format);
            if (date.isValid) break;
        }

        // Fallback to ISO if no format matched
        if (!date || !date.isValid) {
            date = DateTime.fromISO(input);
        }

        if (date.isValid) {
            const formatted = date.toFormat('yyyy-MM-dd');
            this.log('Formatted date to ISO:', formatted);
            return formatted;
        } else {
            console.error('Invalid date');
            throw new Error('Invalid date format. Please provide a valid date.');
        }
    }

    /**
     * Initializes trigger cards for the app.
     */
    initTriggers() {
        this.triggers.scheduled_message_trigger = this.homey.flow.getTriggerCard('scheduled_message_trigger');
        this.triggers.scheduled_message_trigger.registerRunListener(async (args, state) => {
            this.trace('Scheduled message triggered');
            // Handle the trigger logic here
            return true; // Return true to indicate success
        });
    }

    /**
     * Initializes condition cards for the app.
     */
    initConditions() {
        // Initialize condition cards if any
        const category_condition = this.homey.flow.getConditionCard('category_condition');
        category_condition.registerRunListener(async (args, state) => {
            this.homey.app.log({ args, state });
            return (await state.category) === args.category_condition;
        });
    }
}

export default ScheduleMessageApp;
