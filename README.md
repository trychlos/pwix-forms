# pwix:forms

## What is it ?

A package to manage forms in Meteor.

Ideally this would be an extension of `aldeed:autoform`, but this later is not yet Meteor 3.0 compatible, while the previous `pwix:core-app.FormChecker` family was already async-ready.

## Conceptuals

At the root of all, we have individual fields.

Each field must be checked both on client side, and on server side. Check functions are mutualized, and so are all aysnc.

Fields must be checked each against others at the level of the display unit (what the user actually sees). For example, in a tabbed page, each tab should be created and organized following a business logical, and so should the checks (and the error messages).

In the above example, the whole page should be checked for consistency, so another level of checks.

And, because a tab may itself include a tab, which itself may include another level of tabs, and so on, the level of checks ust be left undetermined.

## Configuration

The package's behavior can be configured through a call to the `Forms.configure()` method, with just a single javascript object argument, which itself should only contains the options you want override.

Known configuration options are:

- `verbosity`

    Define the expected verbosity level.

    The accepted value can be any or-ed combination of following:

    - `Forms.C.Verbose.NONE`

        Do not display any trace log to the console

    - `Forms.C.Verbose.CONFIGURE`

        Trace `Forms.configure()` calls and their result

Please note that `Forms.configure()` method should be called in the same terms both in client and server sides.

Remind too that Meteor packages are instanciated at application level. They are so only configurable once, or, in other words, only one instance has to be or can be configured. Addtionnal calls to `Forms.configure()` will just override the previous one. You have been warned: **only the application should configure a package**.

## Provides

`Forms` global variable provides following items:

### Functions

- `Forms.configure()`

    See above.

-  `Forms.i18n.namespace()`

    Returns the i18n namespace used by the package. Used to add translations at runtime.

    Available both on the client and the server.

-  `Forms.toSchema( fields<Array> )`

    Returns a SimpleSchema instance from the provided fields.

    Available both on the client and the server.

-  `Forms.toTabular( fields<Array> )`

    Returns an array suitable to `pwix:tabular-ext` usage

    Available both on the client and the server.

### Blaze components

#### `coreFieldCheckIndicator`

Display an indicator about the validity status of a field.

Parameters:

- type: a `Forms.FieldCheck` constant as `INVALID`, `NONE`, `UNCOMPLETE` or `VALID`.

#### `coreFieldTypeIndicator`

Display an indicator about the type of a field.

Parameters:

- type: a `Forms.FieldType` constant as `INFO`, `SAVE` or `WORK`
- classes: if set, a list of classes to be added to the default ones.

## NPM peer dependencies

Starting with v 0.3.0, and in accordance with advices from [the Meteor Guide](https://guide.meteor.com/writing-atmosphere-packages.html#peer-npm-dependencies), we no more hardcode NPM dependencies in the `Npm.depends` clause of the `package.js`.

Instead we check npm versions of installed packages at runtime, on server startup, in development environment.

Dependencies as of v 0.3.0:
```
    '@popperjs/core': '^2.11.6',
    'bootstrap': '^5.2.1',
    'lodash': '^4.17.0'
```

Each of these dependencies should be installed at application level:
```
    meteor npm install <package> --save
```

## Translations

New and updated translations are willingly accepted, and more than welcome. Just be kind enough to submit a PR on the [Github repository](https://github.com/trychlos/pwix-forms/pulls).

## Cookies and comparable technologies

None at the moment.

---
P. Wieser
- Last updated on 2023, June 5th
