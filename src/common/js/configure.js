/*
 * pwix:forms/src/common/js/configure.js
 */

import _ from 'lodash';

import { ReactiveVar} from 'meteor/reactive-var';

let _conf = {};

Forms._conf = new ReactiveVar( _conf );

Forms._defaults = {
    checkStatusOverridable: true,
    fieldStatusShow: Forms.C.ShowStatus.INDICATOR,
    fieldTypeShow: true,
    verbosity: Forms.C.Verbose.CONFIGURE
};

/**
 * @summary Get/set the package configuration
 *  Should be called *in same terms* both by the client and the server.
 * @param {Object} o configuration options
 * @returns {Object} the package configuration
 */
Forms.configure = function( o ){
    if( o && _.isObject( o )){
        _.merge( _conf, Forms._defaults, o );
        Forms._conf.set( _conf );
        _verbose( Forms.C.Verbose.CONFIGURE, 'pwix:forms configure() with', o );
    }
    // also acts as a getter
    return Forms._conf.get();
}

_.merge( _conf, Forms._defaults );
Forms._conf.set( _conf );
