/*
 * pwix:forms/src/common/classes/panel-spec.class.js
 *
 * Gathers a keyed set of fields specifications for a form panel.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { Base } from '../../common/classes/base.class.js';

import { IEnumerable } from '../../common/interfaces/ienumerable.iface.js';
import { IInstanciationArgs } from '../../common/interfaces/iinstanciation-args.iface.js';

import { FieldSpec } from '../classes/field-spec.class.js';

import { IPanelSpec } from '../interfaces/ipanel-spec.iface.js';

export class PanelSpec extends mix( Base ).with( IEnumerable, IInstanciationArgs, IPanelSpec ){

    // static data

    // static methods

    // private data

    // the FieldSpec's set
    #set = null;

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new PanelSpec instance
     * @param {Object} arg an optional panel specification as provided by the application
     * @returns {PanelSpec} this instance
     */
    constructor( arg ){
        assert( !arg || _.isObject( arg ), 'expect a plain javascript object' );

        super( ...arguments );
        const self = this;

        //Object.keys( args ).forEach(( key ) => {
        //});

        // instanciate a FieldSpec object for each field description
        this.#set = {};
        const cb = function( key, value ){
            self.#set[key] = new FieldSpec( key, value );
            return true;
        };
        this.iEnumerateKeys( cb );

        // setup the new enumeration reference as a keyed object
        this.iEnumerableBase( this.#set );

        return this;
    }
}
