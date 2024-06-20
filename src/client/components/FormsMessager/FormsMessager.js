/*
 * pwix:forms/src/client/components/FormsMessager/FormsMessager.js
 *
 * Display a message on the bottom of a edition (either modal or page) panel.
 *
 * Messages may be rather simple: just display a message on the bottom, color it in red, and disable the OK button. That's all.
 * But, when your dialog is a bit more complex, you have several panels or several tabs, some errors are expected to block the panel
 * validation and the recording of the item, but some others only alter its good behavior, which may be fixed later. So should only
 * be considered as warnings.
 *
 * There may be several errors, and the user may want just see all of them, in order to decide himself which one will be first fixed.
 * So:
 *  - this component is just responsible to display the most recent pushed message
 *  - a companion component is able to display all current error/warning/infos messages.
 *
 * Parms:
 *  - messager: an object compliant with the IMessager interface
 *  - classes: classes to be added to the displayed message whatever be its type, defaulting to nothing
 */

import './FormsMessager.html';
import './FormsMessager.less';

Template.FormsMessager.onRendered( function(){

    // track stack setup
    if( false ){
        this.autorun(() => {
            const messager = Template.currentData().messager;
            console.debug( 'messager', messager );
        });
    }

    // track the stack content
    if( false ){
        this.autorun(() => {
            const messager = Template.currentData().messager;
            if( messager ){
                console.debug( messager.iMessagerDump());
            }
        });
    }
});

Template.FormsMessager.helpers({
    // common classes to be added to the displayed message, whatever be its type
    classes(){
        return this.classes || '';
    },

    // the content of the message as a simple string (not HTML)
    //  because we do not want have several lines, or bold, or any other singularities here
    //  nevertheless the Blaze tempate itself is HTML-capable to be able to handle the '&nbsp;' character
    msgLabel(){
        const o = this.messager?.iMessagerLast();
        return o ? o.iTypedMessageMessage() : '&nbsp;';
    },

    // the class to be associated to the error message: may be an error, a warning, an info, etc.
    msgLevel(){
        const o = this.messager?.iMessagerLast();
        return o ? o.iTypedMessageLevel() : '';
    }
});
