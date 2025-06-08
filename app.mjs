'use strict';

import Homey from 'homey';
// import flowActions from './lib/flows/actions.mjs';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ScheduleMessageApp extends Homey.App {
    /**
     * Called when the app is initialized.
     * It logs the initialization message, initializes flow cards,
     * loads or persists the queue, and starts processing the queue.
     * @returns {Promise<void>}
     */
    async onInit() {
        try {
            this.log(`${Homey.manifest.id} has been initialized`);

            this.queue = [];
            this.triggers = {};

            await this.initFlowCards();
            await this.persistOrLoadQueue(true, true);
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
     */
    persistOrLoadQueue(load = true, reset = false) {
        const persistentDir = path.resolve(__dirname, '/userdata/');
        const persistentFile = 'queue.json';
        const persistentPath = path.join(persistentDir, persistentFile);

        if (load && (reset || !existsSync(persistentPath))) {
            this.log('[persistOrLoadQueue]', 'Queue file does not exist, creating new queue.');
            this.queue = [];
        } else if (load) {
            this.queue = JSON.parse(readFileSync(persistentPath));
            this.log('[persistOrLoadQueue]', 'Queue loaded successfully:', this.queue);
        } else {
            this.log('[persistOrLoadQueue]', 'Persisting queue to file...');
            writeFileSync(persistentPath, JSON.stringify(this.queue, null, 2));
        }
    }

    /**
     * Processes the queue by checking if the scheduled date and time is in the past.
     * If it is, it triggers the scheduled message flow card.
     * It runs every second to check for jobs that need to be executed.
     */
    processQueue() {
        this.log('[processQueue] - Starting to process the queue every second', this.queue.length);
        setInterval(() => {
            const now = DateTime.local({ zone: this.homey.clock.getTimezone() });

            let changed = false;

            // loop through the queue and process jobs check if the datetime is in the past
            for (let i = 0; i < this.queue.length; i++) {
                const job = this.queue[i];
                if (job.scheduledDateTime <= now) {
                    this.log('⏰ Running job:', job.message, 'recipient:', job.recipient, 'category:', job.category, 'at', job.scheduledDateTime.toISO());

                    const tokensAndState = { recipient: job.recipient, message: job.message, category: job.category };
                    this.triggers.scheduled_message_trigger.trigger(tokensAndState, tokensAndState);

                    this.queue.splice(i, 1);
                    changed = true;
                }
            }

            if (changed) this.persistOrLoadQueue(false);
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
        const set_scheduled_message = this.homey.flow.getActionCard('set_scheduled_message');
        set_scheduled_message.registerRunListener(async (args, state) => {
            this.log('[Actions] - set_scheduled_message');

            const { date, time, recipient, message, category } = args;

            this.runAction(date, time, message, category, recipient);
        });

        const set_scheduled_message_raw = this.homey.flow.getActionCard('set_scheduled_message_raw');
        set_scheduled_message_raw.registerRunListener(async (args, state) => {
            try {
                this.log('[Actions] - set_scheduled_message_raw', args);

                let input = args.data || {};
                const { category = 'None' } = args;

                if (args.prefix && args.prefix.length && input.startsWith(args.prefix)) {
                    input = input.slice(args.prefix.length); // Remove the leading prefix
                }

                const pipeCount = (input.match(/\|/g) || []).length;

                if (pipeCount !== 3 && pipeCount !== 2) {
                    this.error('Invalid data format. Expected 2 or 3 pipes (|) in the input string. 3: date|time|recipient|message or 2: date|time|message');
                    throw new Error('Invalid data format. Expected 2 or 3 pipes (|) in the input string. 3: date|time|recipient|message or 2: date|time|message');
                }

                if (pipeCount === 2) {
                    const [date, time, message] = input.split('|');

                    this.runAction(date, time, category, message);
                }

                if (pipeCount === 3) {
                    const [date, time, recipient, message] = input.split('|');

                    this.runAction(date, time, message, category, recipient);
                }
            } catch (error) {
                if (!error) {
                    throw new Error('Invalid data format. Please provide data in the format: date|time|recipient|message or date|time|message');
                }

                throw error;
            }
        });
    }

    runAction(date, time, message, category, recipient = 'Unknown recipient') {
        try {
            const timeZone = this.homey.clock.getTimezone();
            const [day, month, year] = date.split('-');
            const isoDate = `${year}-${month}-${day}`;
            const scheduledDateTime = DateTime.fromISO(`${isoDate}T${time}`, { zone: timeZone });

            // check if the scheduled date and time is in the past
            if (scheduledDateTime < DateTime.local({ zone: timeZone })) {
                this.error('Scheduled date and time is in the past. Please provide a future date and time.');
                throw new Error('Scheduled date and time is in the past. Please provide a future date and time.');
            }

            this.log('runAction', { category, recipient, message, isoDate, date, time, timeZone, scheduledDateTime });

            this.queue.push({ recipient, message, scheduledDateTime, category });
            this.queue.sort((a, b) => a.scheduledDateTime - b.scheduledDateTime); // Keep sorted
            this.persistOrLoadQueue(false);
        } catch (error) {
            this.error('Error in runAction:', error);
            throw error;
        }
    }

    /**
     * Initializes trigger cards for the app.
     */
    initTriggers() {
        this.triggers.scheduled_message_trigger = this.homey.flow.getTriggerCard('scheduled_message_trigger');
        this.triggers.scheduled_message_trigger.registerRunListener(async (args, state) => {
            this.log('[Triggers] - Scheduled message triggered');
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
            this.homey.app.log('[category_condition]', {args, state});
            return (await state.category) === args.category_condition;
        });
    }
}

export default ScheduleMessageApp;
