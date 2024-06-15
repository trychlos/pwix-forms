/*
 * pwix:forms/src/common/classes/field.class.js
 *
 * A class which addresses each data usage, from the collection schema to a tabular display or individual field input and check.
 * Each field definition is to be provided by the application through a FieldSpec instance.
 *
 * Field definition is mainly an extension of a SimpleSchema definition with some modifications:
 *
 * - name: optional, the name of the field in the collection
 *   when unset, the field is not defined in the collection (though can appear in a tabular display or be managed inside of an input panel)
 *
 * - schema: when false, let this field be fully ignored by the collection schema
 *   defauts to true
 *
 * 'dt_'-prefixed keys target the tabular display, and accept any [Datatable column definition](https://datatables.net/reference/option/columns), plus:
 *
 * - dt_tabular: when false, let this field be fully ignored in the tabular display
 *   defauts to true
 *
 * - dt_template: stands for `aldeed:tabular` tmpl
 *
 * - dt_templateContext: stands for `aldeed:tabular` tmplContext
 *
 * 'form_'-prefixed keys target the input panel (and more specifically `pwix:forms` package).
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { ICheckable } from '../interfaces/icheckable.iface.js';
import { IInstanciationArgs } from '../interfaces/iinstanciation-args.iface.js';
import { ISchema } from '../interfaces/ischema.iface.js';
import { ITabular } from '../interfaces/itabular.iface.js';

import { Base } from './base.class.js';

export class Field extends mix( Base ).with( IInstanciationArgs, ICheckable, ISchema, ITabular ){

    // static data

    // static methods

    // private data

    // runtime data

    // private methods

    // protected methods

    /*
     * @locus Everywhere
     * @returns {Object} the field definition
     * @rationale
     *  We do not care to interpret/reclass each and every possible key/value pair at instanciation time.
     *  Instead we rely of IInstanciationArgs interface to remind us of the initial definition
     *  Users of this class call methods, and each method can ask for the initial definition here
     */
    _defn(){
        return this.iInstanciationArgs()[0];
    }

    // public data

    /**
     * Constructor
     * @locus Everywhere
     * @param {Object} o the field definition provided by the application
     * @returns {Field} this instance
     */
    constructor( o ){
        assert( o && _.isObject( o ), 'definition must be a plain javascript Object' );
        super( ...arguments );
        return this;
    }

    /**
     * @locus Everywhere
     * @returns {String} the 'name' value, or null if it is not set
     */
    name(){
        return this._defn().name || null;
    }
}
