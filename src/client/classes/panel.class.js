/*
 * pwix:forms/src/client/classes/panel.class.js
 *
 * Gathers a keyed set of fields specifications for a form panel.
 * 
 * This class is obsoleted starting with v1.6 - Is only kept so that applications can still instanciate something
 * (before receiving a fatal error message!)
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import mix from '@vestergaard-company/js-mixin';

import { Field } from 'meteor/pwix:field';
import { Logger } from 'meteor/pwix:logger';

import { Base } from './base.class.js';

import { ISeq } from '../interfaces/iseq.iface.js';

const logger = Logger.get();

export class Panel extends mix( Base ).with( ISeq ){

    // static data

    // static methods

    // private data

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * @constructor
     * @locus Client
     * @summary Instanciates a new Panel instance
     * @param {Object} arg a panel specification as provided by the application
     *  This is a keyed object, where keys are the field names, and values the field specifications for this panel
     * @param {Field.Set} set an optional previously defined Field.Set object which is able to provide default values
     * @returns {Panel} this instance
     *  NB: we keep none of the provided instanciation args, relying on them to build the Forms.FormField set of data we need
     */
    constructor( arg, set ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.Panel()', arg, set );
        return this;
    }
}
