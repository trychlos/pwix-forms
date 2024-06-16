/*
 * pwix:forms/src/client/classes/messager.class.js
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { TM } from 'meteor/pwix:typed-message';

import { IMessager } from '../interfaces/imessager.iface.js';

export class Messager extends mix( TM.MessagesSet ).with( IMessager ){

    // static data

    // static methods

    // private data

    //runtime data

    // private methods

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @returns {Messager} this Messager instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }
}
