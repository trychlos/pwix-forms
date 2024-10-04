Package.describe({
    name: 'pwix:forms',
    version: '1.3.0',
    summary: 'Meteor forms management',
    git: 'https://github.com/trychlos/pwix-forms.git',
    documentation: 'README.md'
});

Package.onUse( function( api ){
    configure( api );
    api.export([
        'Forms'
    ]);
    api.mainModule( 'src/client/js/index.js', 'client' );
    api.mainModule( 'src/server/js/index.js', 'server' );
});

Package.onTest( function( api ){
    configure( api );
    api.use( 'tinytest' );
    api.use( 'pwix:forms' );
    api.mainModule( 'test/js/index.js' );
});

function configure( api ){
    api.versionsFrom([ '2.9.0', '3.0' ]);
    api.use( 'aldeed:simple-schema@1.13.1 || 2.0.0' );
    api.use( 'blaze-html-templates@2.0.0 || 3.0.0-alpha300.0', 'client' );
    api.use( 'ecmascript' );
    api.use( 'less@4.0.0', 'client' );
    api.use( 'pwix:field@1.0.0-rc' );
    api.use( 'pwix:typed-message@1.2.0' );
    api.use( 'pwix:ui-bootstrap5@2.0.0' );
    api.use( 'pwix:ui-fontawesome6@1.0.0' );
    api.use( 'pwix:ui-utils@1.1.0' );
    api.use( 'reactive-dict' );
    api.use( 'reactive-var' );
    api.use( 'tmeasday:check-npm-versions@1.0.2 || 2.0.0-rc300.0', 'server' );
    api.use( 'tracker' );
    api.addFiles( 'src/client/components/FormsStatusIndicator/FormsStatusIndicator.js', 'client' );
    api.addFiles( 'src/client/components/FormsTypeIndicator/FormsTypeIndicator.js', 'client' );
    api.addFiles( 'src/client/components/FormsMessager/FormsMessager.js', 'client' );
}

// NPM dependencies are checked in /src/server/js/check_npms.js
// See also https://guide.meteor.com/writing-atmosphere-packages.html#peer-npm-dependencies
