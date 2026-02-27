/*
 * pwix:forms/src/client/interfaces/ichecker-events.iface.js
 *
 * ICheckerEvents let us manage the events from and to a Checker.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';

const logger = Logger.get();

export const ICheckerEvents = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    // returns the FormField relative to the element which is the source of this event, or null
    _fieldSpecFromEvent( event ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerEvents._fieldSpecFromEvent()' );
        let found = null;
        const instance = this.argInstance();
        const cb = function( name, spec ){
            const uiNode = spec.iRunUINode();
            if( uiNode[0].isSameNode( event.target ) || $.contains( uiNode[0], event.target )){
                found = spec;
            }
            return found === null;
        }
        this.fieldsIterate( cb );
        return found;
    }

    // input handler
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event
    // The input event fires when the value of an <input>, <select>, or <textarea> element has been changed as a direct result of a user action (such as typing in a textbox or checking a checkbox).
    // - event is a jQuery.Event
    _inputHandler( event ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerEvents._inputHandler()', event );
        const spec = this._fieldSpecFromEvent( event );
        if( spec ){
            spec.iFieldRunInputHandler();
        } else {
        }
    }

    // validity handler
    _validityHandler( event ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerEvents._validityHandler()', event );
    }

    /**
     * @returns {ICheckerEvents} the instance
     */
    constructor( name, args ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerEvents.ICheckerEvents()', name, args );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Install an input handler on the topmost node
     */
    eventInstallInputHandler(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerEvents.eventInstallInputHandler()' );
        const $node = this.rtTopmost();
        const self = this;
        $node.on( 'input', ( event ) => { self._inputHandler( event ); });
    }

    /**
     * @summary Install the validity handler on the topmost node
     */
    eventInstallValidityHandler(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerEvents.eventInstallValidityHandler()' );
        const $node = this.rtTopmost();
        const self = this;
        const validityEvent = self.confValidityEvent();
        $node.on( validityEvent, ( event ) => { self._validityHandler( event ); });
    }
});
