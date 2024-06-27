# pwix:forms

## What is it ?

A package to manage forms in Meteor.

Ideally this would be an extension of `aldeed:autoform`, but this later is not yet Meteor 3.0 compatible, while the previous `pwix:core-app.FormChecker` family was already async-ready.

## Conceptuals

At the root of all, we have individual fields.

Each field must be checked both on client side, and on server side. Check functions are mutualized, and so are all aysnc.

Fields must be checked each against others at the level of the display unit (what the user actually sees). For example, in a tabbed page, each tab should be created and organized following a business logical, and so should the checks (and the error messages).

In the above example, the whole page should be checked for consistency, so another level of checks.

And, because a tab may itself include a tab, which itself may include another level of tabs, and so on, there must not be any limit to the count of levels of checks.

So each field definition (see below) can be included in a panel, and will be managed by a `Forms.Checker` associated to this panel.

Each `Forms.Checker` may itself be a child of some other `Forms.Checker` (for example the page of tabbed panes) up to having no more parent. We build an arbitrary depth of `Forms.Checker`'s hierarchy.

## Installation

This Meteor package is installable with the usual command:

```sh
    meteor add pwix:forms
```

## Usage

```js
    import { Forms } from 'meteor/pwix:forms';

    const panel = new Forms.Panel({
        username: {
            js: '.js-username'
        },
        loginAllowed: {
            js: '.js-login-allowed'
        }
    });

    const checker = new Forms.Checker( self, {
        panel: panel.iPanelPlus( fieldsSet ),
        data: {
            item: Template.currentData().item
        }
    });
```

## Provides

### `Forms`

The exported `Forms` global object provides following items:

#### Functions

##### `Forms.configure()`

See [below](#configuration).

#####  `Forms.i18n.namespace()`

Returns the i18n namespace used by the package. Used to add translations at runtime.

Available both on the client and the server.

#### Interfaces

##### `Forms.ICheckable`

An interface whichs adds to the implementor the capability of being checked (.e. have a `check()` function), and to provide the expected result.

Each implementation instance is provided a random unique identifier at instanciation time. This identifier let us manages the published `TypedMessage`'s by emitter.

Both `Checker` and `FormField` classes implement this interface.

##### `Forms.IMessager`

A simple interface to let the calling application manage the stack of messages provided by the check functions.

Available methods are:

- `Forms.IMessager.iMessagerClear()`

Clear the message displayed in the message zone.

- `Forms.IMessager.iMessagerDump()`

Dump the full content of the messages stack.

- `Forms.IMessager.iMessagerLast()`

Returns the last pushed message in level order.

- `Forms.IMessager.iMessagerPush( message<TypedMessage>, id<String> )`

Push a new message to the messages stack.

- `Forms.IMessager.iMessagerRemove( ids<Array> )`

Remove from the messages stack those published by the provided `ICheckable` identifiers.

#### Classes

##### `Forms.Checker`

This is the class which manages all the checks to be done in a panel, publishing relevant messages if any.

It should be instanciated as a ReactiveVar when the DOM is rendered.

Example:

```js
    Template.myPanel.onRendered( function(){
        const self = this;
        // initialize the Checker for this panel as soon as we get the parent Checker
        self.autorun(() => {
            const parentChecker = Template.currentData().checker.get();
            const checker = self.APP.checker.get();
            if( parentChecker && !checker ){
                self.APP.checker.set( new Forms.Checker( self, {
                    parent: parentChecker,
                    panel: self.APP.panel,
                    data: {
                        item: Template.currentData().item
                    }
                }));
            }
        });
    });
```

Only available on the client.

##### `Forms.Panel`

Let the calling application defines the fields managed in the panel, taking most of its values from a previously defined `Field.Set` object.

Usage:

```js
    import { Field } from 'meteor/pwix:field';
    import { Forms } from 'meteor/pwix:forms';

const panel = new Forms.Panel({
        username: {
            js: '.js-username'
        },
        loginAllowed: {
            js: '.js-login-allowed'
        }
    }, myCollection.fieldsSet );
```

Only available on the client.

### Blaze components

#### `FormsCheckStatusIndicator`

Display an indicator about the check status of a field.

Parameters:

- `statusRv`: a mandatory ReactiveVar which contains the CheckStatus to be displayed
- `classes`: if set, a list of classes to be added to the default
- `title`: if set, a text to replace the default title

#### `FormsFieldTypeIndicator`

Display an indicator about the type of a field.

Parameters:

- type: a constant among:
    - `Forms.C.CheckResult.INVALID`,
    - `Forms.C.CheckResult.UNCOMPLETE`,
    - `Forms.C.CheckResult.VALID`,
    - `Forms.C.CheckResult.NONE`.

- classes: if set, a list of classes to be added to the default

- title: if set, a text to replace the default title

#### `FormsMessager`

Display the last pushed TypedMessage, depending of its level ordering.

Parameters:

- messager: an `Forms.IMessager`-compliant object

- classes: classes to be added to the displayed message whatever be its type, defaulting to none


## Configuration

The package's behavior can be configured through a call to the `Forms.configure()` method, with just a single javascript object argument, which itself should only contains the options you want override.

Known configuration options are:

- `checkStatusShow`

    Whether input fields should have a check status (valid/uncomplete/invalid) indicator, where available values are:

    - `Forms.C.CheckStatus.NONE`

        Do not show any status indicator

    - `Forms.C.CheckStatus.BOOTSTRAP`

        Uses the [Bootstrap](https://getbootstrap.com/) classes to indicate the status. Only applies to fields.

    - `Forms.C.CheckStatus.INDICATOR`

        Uses an icon indicator.

        On fields, the package is able to automatically append the indicator on the right of the field.

    Defaults to `Forms.C.CheckStatus.INDICATOR`.

    `pwix:forms` is able to automagically add a status indicator on the right of each field, unless this feature is disabled by the package configuration, or at the `Checker` level, or individually for each field.

    If the caller wishes an indicator at the panel level, it can use, in place or besides of fields indicators, the `FormsCheckStatusIndicator` Blaze component.

- `checkStatusOverridable`

    Whether the previous `checkStatusShow` is overridable when instanciating a `Checker` or specifying a field in the panel.

    Defaults to `true`.

- `displayFieldTypeIndicator`

    Whether input fields should default to be prefixed with a type (mandatory/optional) indicator.

    Defaults to `true`.

    This default value can be overriden at the Checker level.

    This option only applies if the field is specified with a `type` value among:

    - `Forms.FieldType.C.INFO`
    - `Forms.FieldType.C.MANDATORY`
    - `Forms.FieldType.C.OPTIONAL`
    - `Forms.FieldType.C.WORK`

- `verbosity`

    Define the expected verbosity level.

    The accepted value can be any or-ed combination of following:

    - `Forms.C.Verbose.NONE`

        Do not display any trace log to the console

    - `Forms.C.Verbose.CONFIGURE`

        Trace `Forms.configure()` calls and their result

Please note that `Forms.configure()` method should be called in the same terms both in client and server sides.

Remind too that Meteor packages are instanciated at application level. They are so only configurable once, or, in other words, only one instance has to be or can be configured. Addtionnal calls to `Forms.configure()` will just override the previous one. You have been warned: **only the application should configure a package**.

`Forms.configure()` is a reactive data source.

## NPM peer dependencies

Starting with v 0.3.0, and in accordance with advices from [the Meteor Guide](https://guide.meteor.com/writing-atmosphere-packages.html#peer-npm-dependencies), we no more hardcode NPM dependencies in the `Npm.depends` clause of the `package.js`.

Instead we check npm versions of installed packages at runtime, on server startup, in development environment.

Dependencies as of v 0.3.0:

```js
    '@popperjs/core': '^2.11.6',
    'bootstrap': '^5.2.1',
    'lodash': '^4.17.0'
```

Each of these dependencies should be installed at application level:

```sh
    meteor npm install <package> --save
```

## Translations

New and updated translations are willingly accepted, and more than welcome. Just be kind enough to submit a PR on the [Github repository](https://github.com/trychlos/pwix-forms/pulls).

## Cookies and comparable technologies

None at the moment.

## Issues & help

In case of support or error, please report your issue request to our [Issues tracker](https://github.com/trychlos/pwix-forms/issues).

---
P. Wieser
- Last updated on 2023, June 5th
