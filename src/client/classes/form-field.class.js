/*
 * pwix:forms/src/common/classes/form-field.class.js
 *
 * The specifications to manage a field in a form panel.
 *
 * This is derived from Field.Def, on the client only, and completed with the values for this panel
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { Field } from 'meteor/pwix:field';

import { ICheckable } from '../../common/interfaces/icheckable.iface.js';
import { IStatusable } from '../../common/interfaces/istatusable.iface.js';

import { IFieldRun } from '../interfaces/ifield-run.iface.js';
import { IFieldSpec } from '../interfaces/ifield-spec.iface.js';

export class FormField extends mix( Field.Def ).with( IFieldRun, IFieldSpec, ICheckable, IStatusable ){

    // static data

    // static methods

    // private data

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new FormField instance
     * @param {Object} args the Field.Def definition merged with the specification for this panel
     * @returns {FormField} this instance
     */
    constructor( args ){
        assert( args && _.isObject( args ), 'expect a plain javascript Object, found', args );

        super( ...arguments );

        //console.debug( this );
        return this;
    }
}
