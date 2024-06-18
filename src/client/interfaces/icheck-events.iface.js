/*
 * pwix:forms/src/common/interfaces/icheck-events.iface.js
 *
 * ICheckEvents let us manage the events from and to a Checker.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';

import '../../common/js/index.js';

import { IFieldSpec } from './ifield-spec.iface.js';

export const ICheckEvents = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    // returns the FieldSpec relative to the element which is the source of this event, or null
    _fieldSpecFromEvent( event ){
        _trace( 'ICheckEvents._fieldSpecFromEvent' );
        const panel = this._getPanelSpec();
        let field = null;
        if( panel ){
            field = panel.iPanelFieldFromEvent( event );
        }
        return field;
    }

    // install an input handler if we have any node
    _initInstallInputHandler(){
        _trace( 'ICheckEvents._initInstallInputHandler' );
        const instance = this._getInstance();
        const $node = instance.$( instance.firstNode );
        if( $node.length ){
            const panel = this._getPanelSpec();
            if( panel ){
                const fields = panel.iPanelFieldsList();
                if( fields.length ){
                    const self = this;
                    $node.on( 'input', ( event ) => { self._inputHandler( event ); });
                }
            }
        }
    }

    // install the validity handler if we have any node
    _initInstallValidityHandler(){
        _trace( 'ICheckEvents._initInstallValidityHandler' );
        const instance = this._getInstance();
        const $node = instance.$( instance.firstNode );
        if( $node.length ){
            const self = this;
            const validityEvent = self._getValidityEvent();
            $node.on( validityEvent, ( event ) => { self._validityHandler( event ); });
        }
    }

    // input handler
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event
    // The input event fires when the value of an <input>, <select>, or <textarea> element has been changed as a direct result of a user action (such as typing in a textbox or checking a checkbox).
    // - event is a jQuery.Event
    _inputHandler( event ){
        _trace( 'ICheckEvents._inputHandler', event );
        console.debug( '_inputHandler', event );
        const field = this._fieldSpecFromEvent( event );
        if( field ){
            check( field, IFieldSpec );
            this.iCkFieldCheck( field, this._getInstance().$( event.target ));
        } else {
            console.debug( 'not handled here' );
        }
    }

    // validity handler
    _validityHandler( event ){
        _trace( 'ICheckEvents._validityHandler' );
        console.debug( 'validityHandler', event );
    }

    /**
     * @returns {ICheckEvents} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckEvents.ICheckEvents' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary ICheckEvents initialization
     *  Install events handlers
     *  - requires to have an (Blaze.TemplateInstance) instance
     *  - install an input handler if we have fields
     *  - always install a validity handler
     */
    iCkEventsInit(){
        _trace( 'ICheckEvents.iCkEventsInit' );
        this._initInstallInputHandler();
        this._initInstallValidityHandler();
    }

    /**
     * @summary Per field initialization
     */
    iCkEventsInitField( name, spec ){
        _trace( 'ICheckEvents.iCkEventsInitField', name );
    }
});
