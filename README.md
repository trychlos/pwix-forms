# pwix:forms

## What is it ?

A package to manage forms in Meteor.

Ideally this would be an extension of `aldeed:autoform`, but this later is not (at the moment) Meteor 3.0 compatible, while the previous `pwix:core-app.FormChecker` family was already async-ready.

It aims to provide a dynamic user interface where the user can easily see the result of his/her changes.

## Conceptuals

At the root of all, we have individual fields.

Each field must be checked both on client side, and on server side. Check functions are thought to be mutualized, and so are most probably aysnc.

Fields must be checked each against others at the level of the display unit (what the user actually sees). For example, in a tabbed page, each tab should be created and organized following a business logical, and so should the checks (and the error messages).

In the above example, the whole page should be checked for consistency, so another level of checks.

And, because a tab may itself include a tab, which itself may include another level of tabs, and so on, there must not be any limit to the count of levels of checks.

So each field definition (see below) can be attached to a checker, and will be managed by the `Forms.Checker`.

Each `Forms.Checker` may itself be a child of some other `Forms.Checker` (for example the page of tabbed panes) up to having no more parent. We build an arbitrary depth of `Forms.Checker`'s hierarchy.

So the `Forms.Checker` both manages individual fields directly attached to it, and then propagates to its collaterals and its parents.

Messages are stacked, and the most recent or the most important is shown first.

## Installation

This Meteor package is installable with the usual command:

```sh
    meteor add pwix:forms
    meteor npm install lodash @vestergaard-company/js-mixin --save
```

## Usage

```js
    import { Forms } from 'meteor/pwix:forms';
    import { ReactiveVar } from 'meteor/reactive-var';
    import { Tracker } from 'meteor/tracker';

    Template.my_app_template.onCreated( function(){
        const self = this;
        self.checker = null;
        self.fields = {
            username: {
                js: '.js-username'
            },
            loginAllowed: {
                js: '.js-login-allowed'
            }
        };
    });

    // because checker initialization is an async task, we have to guard against re-running the same piece of code before having set the variable
    // because app wants a single checker as soon as it has got the ad-hoc data context, the computation is stopped when done
    // because Forms installs an autorun() to advertise of checker validity and status, we must run under the nonreactive() protection

    Template.my_app_template.onRendered( function(){
        const self = this;
        let running = false;
        this.autorun(( comp ) => {
            let checker = self.checker;
            if( !checker && !running ){
                running = true;
                Tracker.nonreactive(() => {
                    checker = new Forms.Checker( self );
                    checker.init({
                        parent: Template.currentData().checker.get(),
                        data: {
                            item: Template.currentData().item
                        },
                        panel: {
                            fields: self.fields,
                            set: app.fieldSet
                        }
                    }).then(() => {
                        self.checker = checker;
                        comp.stop();
                    });
                });
            }
        });
    });
```

## Provides

### `Forms`

The exported `Forms` global object provides following items:

#### Classes

##### `Forms.Checker`

This is the class which manages all the checks to be done in a panel, publishing relevant messages if any.

It may be instanciated as a ReactiveVar when the DOM is rendered, so that other code can reacts when it has been instanciated.

Only available on the client.

###### `Forms.Checker.Checker( <Blaze.TemplateInstance> ): <Forms.Checker>`:

Instanciation takes a single argument which is the current Blaze.TemplateInstance instance:

- let us defines autorun() functions

- provides a '$' jQuery operator which is tied to this template instance

- provides the DOM element which will act as a global event receiver

- provides the topmost DOM element to let us find all managed fields.

###### `async Forms.Checker.init( <Object> ): <Forms.Checker>`:

Before to be useful for anything, the Forms.Checker MUST be initialized, even with no or an empty object argument.

The argument object is optional, and may contain following keys:

- `check`: whether a first check() is run at end of the initialization, defaulting to `true`

- `crossCheckRegisterFn`: if set, a cross check function or an array of cross check functions to be called when the checker is valid (aka not any message); `Forms` propagate this function call up to the topmost checker of the hierarchy
    prototype is `async crossCheckFn( data<Any>, opts<Object> ): null|Array<TypedMessage>`

- `data`: an optional opaque object to be passed to field-defined functions as second argument, or cross check function as first argument

- `enabled`: whether the new checker will start with checks enabled, defaulting to `true`; a disabled Checker doesn't check nor propagates

- `fieldStatusShow`: whether and how to display the result indicator on the right of the field, either `false` or a value from `Forms.C.ShowStatus`; only considered if the corresponding package configured value is overridable

- `fieldTypeShow`: whether to display a field type indicator on the left of each field; this value overrides the configured default value; it only applies if the field is itself qualified with a 'type' in the Forms.FieldType set

- `messager`: an optional [`Forms.IMessager`](#forms-imessager) implementation

    this is a caller's design decision to have a message zone per form panel, or globalized at a higher level;
    in this later case, caller doesn't need to address the globalized messager at any lower panel level: it is enough to identify it at the parent Checker level (if any); the up-propagation will eventually feed the messager.

- `name`: an optional instance name

- `onFieldUpdateRegisterFn`: if set, a function or an array of functions to be called on each field update; Forms propagate this function call up to the topmost checker of the hierarchy

    prototype is `async onFieldUpdateFn( data<Any>, opts<Object> ): void`

- `onValidityChangeRegisterFn`: if set, a function or an array of functions to be called when the validity of the checker changes

    prototype is `async onValidityChangeFn( valid<Boolean> ): void`

    this used to be a `okFn()` function argument, which has been deprecated starting with v1.6

- `panel`: an optional object which describes the fields to be managed, with following keys:

    - `fields`: the fields to be managed in this form panel, as an object indexed by the fields name

    - `set`: an optional `Field.Set` object which will provide default definitions for the fields.

- `parentChecker`: an optional parent Checker instance

    this used to be `parent`, which has been deprecated starting with v1.6

- `parentClass`: if set, the class to be set on the parent DIV inserted on top of each field, defaulting to 'form-indicators-parent'

- `rightSiblingClass`: if set, the class to be set on the DIV inserted just after each field, defaulting to 'form-indicators-right-sibling'

- `rowId`: when the panel is array-ed, the row identifier; will be passed as an option to field-defined check functions

    this used to be an `id` argument, which has been deprecated starting with v1.6

- `trace`: whether to be verbose on the execution, defaulting to `false`

- `validityObject`: if set, a JQuery object which will be automatically enabled/disabled on validity changes

    this used to be a `$ok` argument, which has been deprecated starting with v1.6

##### `Forms.Messager`

Display the messages resulting from the done checks, as a stack ordered by level order first, and push time order then.

#### Functions

##### `Forms.configure()`

See [below](#configuration).

#####  `Forms.i18n.namespace()`

Returns the i18n namespace used by the package. Used to add translations at runtime.

Available both on the client and the server.

#### Interfaces

##### `Forms.ICheckable`

An interface whichs adds to the implementor the capability of being checked (i.e. have a `check()` function), and to provide the expected result. It so has too a status and a validity.

Each implementation instance is provided a random unique identifier at instanciation time. This identifier let us manages the published `TypedMessage`'s by emitter.

Both `Checker` and `FormField` classes implement this interface.

Main available methods are:

- `Forms.ICheckable.iCheckableId()`

Returns the internal identifier of this `ICheckable`.

- `Forms.ICheckable.iCheckableTMsResult()`

Returns the last check result of this `ICheckable`, as an array of `TypedMessage`'s, or null.

- `Forms.ICheckable.iCheckableStatus()`

Returns the last `FieldStatus` of this `ICheckable`, may be `FieldStatus.C.NONE`.

- `Forms.ICheckable.iCheckableValidity()`

Returns the last `true`|`false` validity of this `ICheckable`.

##### `Forms.IMessager`

A simple interface to let the calling application manage the stack of messages provided by the check functions.

Available methods are:

- `Forms.IMessager.iMessagerClear()`

Clear the message displayed in the message zone.

- `Forms.IMessager.iMessagerDump()`

Dump the full content of the messages stack.

- `Forms.IMessager.iMessagerFirst()`

Returns the first pushed message in level order.

- `Forms.IMessager.iMessagerLast()`

Returns the last pushed message in level order.

- `Forms.IMessager.iMessagerPush( message<TypedMessage>, id<String> )`

Push a new message to the messages stack.

- `Forms.IMessager.iMessagerRemove( ids<Array> )`

Remove from the messages stack those published by the provided `ICheckable` identifiers.

### Blaze components

#### `FormsStatusIndicator`

Display an indicator about the check status of a field.

Parameters:

- `statusRv`: a mandatory ReactiveVar which contains the ShowStatus to be displayed, among the possible values:

    - `Forms.FieldStatus.C.INVALID`,
    - `Forms.FieldStatus.C.UNCOMPLETE`,
    - `Forms.FieldStatus.C.VALID`,
    - `Forms.FieldStatus.C.NONE`.

- `classes`: if set, a list of classes to be added to the default
- `title`: if set, a text to replace the default title
- `invalidButton`: if set to true, the `Forms.FieldStatus.C.INVALID` status is displayed as a button
- `uncompleteButton`: if set to true, the `Forms.FieldStatus.C.UNCOMPLETE` status is displayed as a button
- `validButton`: if set to true, the `Forms.FieldStatus.C.VALID` status is displayed as a button
- `buttonOnClick`: a function to trigger on click on button

#### `FormsTypeIndicator`

Display an indicator about the type of a field.

Parameters:

- `type`: a constant among:
    - `Forms.FieldType.C.INFO`,
    - `Forms.FieldType.C.OPTIONAL`,
    - `Forms.FieldType.C.MANDATORY`,
    - `Forms.FieldType.C.WORK`.

- `classes`: if set, a list of classes to be added to the default

- `title`: if set, a text to replace the default title

#### `FormsMessager`

Display the last pushed TypedMessage, depending of its level ordering.

Parameters:

- messager: an `Forms.IMessager`-compliant object

- classes: classes to be added to the displayed message whatever be its type, defaulting to none

## Events

Following events are sent by the package:

- `forms-checker-initialized`

    On the Blaze topmost DOM element of the checker.

    Sent at the end of the initialization.
    
    Held data is:

    - `checker`
    - `checkableId`
    - `status`
    - `validity`

- `forms-checker-update`

    On the Blaze topmost DOM element of the checker.

    Sent each time a user input is detected after field checks.
    
    Held data is:

    - `checker`
    - `checkableId`
    - `status`
    - `validity`
    - `origin`

- `forms-checker-validity`

    On the Blaze topmost DOM element of the checker.

    Sent each time the validity status of the checker changes.
    
    Held data is:

    - `checker`
    - `checkableId`
    - `status`
    - `validity`

## Configuration

The package's behavior can be configured through a call to the `Forms.configure()` method, with just a single javascript object argument, which itself should only contains the options you want override.

Known configuration options are:

- `checkerInitializationEvent`

    The event to be fired when a checker is successfully initialized, defaulting to `forms-checker-initialized`.

- `checkerValidityEvent`

    The event to be fired when the validity of the checker changes, defaulting to `forms-checker-validity`.

- `fieldStatusShow`

    Whether input fields should have a check status (none/valid/uncomplete/invalid) indicator, where available values are:

    - `Forms.C.ShowStatus.NONE`

        Do not show any status indicator

    - `Forms.C.ShowStatus.BOOTSTRAP`

        Uses the [Bootstrap](https://getbootstrap.com/) classes to indicate the status. Only applies to fields.

    - `Forms.C.ShowStatus.INDICATOR`

        Uses an icon indicator.

        On fields, the package is able to automatically append the indicator on the right of the field.

    - `Forms.C.ShowStatus.TRANSPARENT`

        Do not show any status indicator, but make it transparent allowing the user interface to keept a consistent width.

    Defaults to `Forms.C.ShowStatus.INDICATOR`.

    `pwix:forms` is able to automagically add a status indicator on the right of each field, unless this feature is disabled by the package configuration, or at the `Checker` level, or individually for each field.

    If the caller wishes an indicator at the panel level, it can use, in place or besides of fields indicators, the `FormsStatusIndicator` Blaze component.

- `fieldTypeShow`

    Whether input fields should default to be prefixed with a type (mandatory/optional) indicator.

    Defaults to `true`.

    This default value can be overriden at the Checker level.

    This option only applies if the field is specified with a `type` value among:

    - `Forms.FieldType.C.INFO`
    - `Forms.FieldType.C.MANDATORY`
    - `Forms.FieldType.C.OPTIONAL`
    - `Forms.FieldType.C.WORK`
    - `Forms.FieldType.C.NONE`

- `showStatusOverridable`

    Whether the previous `fieldStatusShow` is overridable when instanciating a `Checker` or specifying a field in the panel.

    Defaults to `true`.

- `showTypeOverridable`

    Whether the previous `fieldTypeShow` is overridable when instanciating a `Checker` or specifying a field in the panel.

    Defaults to `true`.

- `verbosity`

    Define the expected verbosity level.

    The accepted value can be any or-ed combination of following:

    - `Forms.C.Verbose.NONE`

        Do not display any trace log to the console

    - `Forms.C.Verbose.CONFIGURE`

        Trace `Forms.configure()` calls and their result.

        This is the default.

- `warnOnDuplicateName`

    Whether to warn when a checker duplicate name is detected, defaulting to `false`.

Please note that `Forms.configure()` method should be called in the same terms both in client and server sides.

Remind too that Meteor packages are instanciated at application level. They are so only configurable once, or, in other words, only one instance has to be or can be configured. Addtionnal calls to `Forms.configure()` will just override the previous one. You have been warned: **only the application should configure a package**.

`Forms.configure()` is a reactive data source.

## NPM peer dependencies

Starting with v 0.3.0, and in accordance with advices from [the Meteor Guide](https://guide.meteor.com/writing-atmosphere-packages.html#peer-npm-dependencies), we no more hardcode NPM dependencies in the `Npm.depends` clause of the `package.js`.

Instead we check npm versions of installed packages at runtime, on server startup, in development environment.

Dependencies as of v 1.6.0:

```js
    'lodash': '^4.17.0',
    '@vestergaard-company/js-mixin': '^1.0.3'
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
- Last updated on 2026, Apr. 2nd
