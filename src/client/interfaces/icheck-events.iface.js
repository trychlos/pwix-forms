/*
 * pwix:forms/src/common/interfaces/icheck-events.iface.js
 *
 * ICheckEvents let us manage the events from and to a Checker.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const ICheckEvents = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    // returns the FieldSpec relative to the element which is the source of this event, or null
    _fieldFromEvent( event ){
        const panel = this._getPanelSpec();
        let field = null;
        if( panel ){
            field = panel.iPanelFieldFromEvent( event );
        }
        return field;
    }

    // input handler
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event
    // The input event fires when the value of an <input>, <select>, or <textarea> element has been changed as a direct result of a user action (such as typing in a textbox or checking a checkbox).
    // - event is a jQuery.Event
    _inputHandler( event ){
        console.debug( 'inputHandler', event );
        const field = this._fieldFromEvent( event );
        if( field ){
            const eltData = this._domDataByEvent( event, field );
            console.debug( 'eltData', eltData );
            if( field.iFieldHaveCheck()){
                //const tm = await field.check();
            }
            console.debug( 'to be handled', field );
            console.debug( 'array-ed', field.iFieldIsArrayed());
        } else {
            console.debug( 'not handleable here' );
        }
    }

    // validity handler
    _validityHandler( event ){
        console.debug( 'validityHandler', event );
    }

    /**
     * @returns {ICheckEvents} the instance
     */
    constructor( name, args ){
        super( ...arguments );
        return this;
    }

    /**
     * @summary Install the events handlers
     *  - requires to have an (Blaze.TemplateInstance) instance
     *  - install an input handler if we have fields
     *  - always install a validity handler
     */
    iEventsInstallHandlers(){
        const self = this;
        const instance = self._getInstance();
        if( instance ){
            const $node = instance.$( instance.firstNode );
            if( $node.length ){
                // set an input handler if we have at least a field
                const panel = self._getPanelSpec();
                if( panel ){
                    const fields = panel.iPanelFieldsList();
                    if( fields.length ){
                        $node.on( 'input', ( event ) => { self._inputHandler( event ); });
                    }
                }
                // set a validity handler
                const validityEvent = self._getValidityEvent();
                $node.on( validityEvent, ( event ) => { self._validityHandler( event ); });
            }
        }
    }
});
