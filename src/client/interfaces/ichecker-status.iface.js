/*
 * pwix:forms/src/client/interfaces/ichecker-status.iface.js
 *
 * ICheckerStatus manages, at the Checker level, both:
 * - a true|false validity
 * - a FieldStatus
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';
import { Tracker } from 'meteor/tracker';

import { FieldStatus } from '../../common/definitions/field-status.def.js'

const logger = Logger.get();

export const ICheckerStatus = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    /*
     * @summary Consolidate the validity/status of each checker to their parent (down-to-up)
     *  Update the relevant Checker data
     */
    async _consolidateStatusCheckersUp(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus._consolidateStatusCheckersUp()' );
        const parent = this.confParent();
        if( parent ){
            let valid = true;
            let statuses = [];
            parent.rtChildren().forEach(( child ) => {
                valid &&= child.iStatusableValidity();
                statuses.push( child.iStatusableStatus());
            });
            parent.iStatusableValidity( valid );
            parent.iStatusableStatus( FieldStatus.worst( statuses ));
            await parent._consolidateStatusCheckersUp();
        }
    }

    /*
     * @summary Consolidate the validity/status of each field for this checker
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     */
    async _consolidateStatusFields( opts ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus._consolidateStatusFields()', opts );
        if( opts.ignoreFields !== true ){
            let valid = true;
            let statuses = [ FieldStatus.C.NONE ];
            const cb = function( name, spec ){
                valid &&= spec.iStatusableValidity();
                statuses.push( spec.iStatusableStatus());
                return valid;
            };
            await this.fieldsIterate( cb );
            this.iStatusableValidity( valid );
            this.iStatusableStatus( FieldStatus.worst( statuses ));
        }
    }

    /**
     * @constructor
     * @param {Blaze.TemplateInstance} instance the bound Blaze template instance
     * @returns {ICheckerStatus} the instance
     */
    constructor( instance ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus.ICheckerStatus()' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Consolidate the validity/status of each field for this checker
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     * @returns {Boolean} the true|false validity flag of this checker
     */
    async statusConsolidate( opts ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus.statusConsolidate()', opts );
        await this._consolidateStatusFields( opts );
        await this._consolidateStatusCheckersUp();
        return this.iStatusableValidity();
    }

    /**
     * @summary Setup an autorun to update the OK button
     *  At the moment, there is no update possible after the init() - so only install if they are something to do
     */
    statusInstallOkAutorun(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus.statusInstallOkAutorun()' );
        const self = this;
        const $object = this.confValidityObject();
        const fnArray = this.confValidityFn().get();
        // doesn't test now the length of $object as dom can be not yet completed
        if(( $object ) || ( fnArray && fnArray.length )){
            Tracker.nonreactive(() => {
                this.argInstance().autorun( async ( c ) => {
                    if( c.firstRun ){
                        c.onStop(() => {
                            // only warn when debugging - this is the normal life for a computation to finish by stop
                            //logger.warning( 'statusInstallOkAutorun() computation stopped' );
                        });
                    }
                    try {
                        const valid = self.iStatusableValidity();
                        if( $object && $object.length ){
                            $object.prop( 'disabled', !valid );
                        }
                        for( const fn of fnArray ){
                            Promise.resolve( fn( valid )).catch(( e ) => { logger.error( e ); });
                        }
                    } catch( e ){
                        logger.error( e );
                    }
                });
            });
        }
    }
});
