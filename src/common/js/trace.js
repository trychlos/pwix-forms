/*
 * pwix:forms/src/common/js/trace.js
 */

_verbose = function( level ){
    if( Forms._conf.verbosity & level ){
        let args = [ ...arguments ];
        args.shift();
        console.debug( ...args );
    }
};

_trace = function( functionName ){
    _verbose( Forms.C.Verbose.FUNCTIONS, ...arguments );
};
