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

So each field definition (see below) can be included in a panel, and will be managed by a Checker associated to this panel.

Each Checker may itself be a child of some other Checker (for example the page of tabbed panes) up to having no more parent. We build an arbitrary depth of Checker's hierarchy.

## Installation

This Meteor package is installable with the usual command:

```sh
    meteor add pwix:forms
```

## Usage

```js
    import { Forms } from 'meteor/pwix:forms';

    // define your fields specifications, both suitable for schema collection, tabular display and form edition
    // this is mainly a SimpleSchema extenstion
    const fieldSet = new Forms.FieldsSet(
        {
            name: 'name'
            type: String
        },
        {
            name: 'surname',
            type: String,
            optional: true
        }
    );
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

#### Classes

##### `Forms.FieldsSet`

An ordered collection of `Forms.Field` objects.

It should be instanciated by the caller with a list of fields definitions as plain javascript objects. For example:

```js
    app.fieldsSet = new Forms.FieldsSet(
        {
            name: '_id',
            type: String,
            dt_tabular: false
        },
        {
            name: 'emails',
            type: Array,
            optional: true,
            dt_visible: false
        },
        {
            name: 'emails.$',
            type: Object,
            optional: true,
            dt_tabular: false
        },
        {
            name: 'emails.$.address',
            type: String,
            regEx: SimpleSchema.RegEx.Email,
            dt_data: false,
            dt_title: pwixI18n.label( I18N, 'list.email_address_th' ),
            dt_template: Meteor.isClient && Template.email_address,
            form_check: AccountsManager.check?.emailAddress,
            form_checkType: 'optional'
        },
        {
            name: 'emails.$.verified',
            type: Boolean,
            dt_data: false,
            dt_title: pwixI18n.label( I18N, 'list.email_verified_th' ),
            dt_template: Meteor.isClient && Template.email_verified,
            form_check: AccountsManager.check?.emailVerified
        },
        {
            dt_template: Meteor.isClient && Template.email_more
        },
        {
            name: 'username',
            type: String,
            optional: true,
            dt_title: pwixI18n.label( I18N, 'list.username_th' ),
            form_check: AccountsManager.check?.username
        },
        {
            name: 'profile',
            type: Object,
            optional: true,
            blackbox: true,
            dt_tabular: false
        },
        Notes.field({
            name: 'userNotes',
            dt_title: pwixI18n.label( I18N, 'list.user_notes_th' ),
            //dt_template: Meteor.isClient && Notes.template
        })
    );
```

Both all fields of a Mongo document, all columns of a tabular display based on this collection, and all fields managed in an editing panel must be defined here. Hence the different definitions.

###### Methods

- `Forms.FieldsSet.byName( name )`

    Returns the named Field object, or null.

    Because the `name` key is optional when defining a field, then not all Field's are retrievable by this method.

- `Forms.FieldsSet.toTabular()`

    Returns an ordered list of columns definitions suitable to [Datatable](https://datatables.net/) initialization.

- `Forms.FieldsSet.toSchema()`

    Returns a [SimpleSchema](https://github.com/Meteor-Community-Packages/meteor-simple-schema) suitable for the collection setup.

###### `Forms.Field`

A class which provides the ad-hoc definitions for (almost) every use of a field in an application, and in particular:

- to a `SimpleSchema` collection schema through the `Forms.ISchema` interface
- to a [`Datatable`](https://datatables.net) tabular display through the `Forms.ITabular` interface
- to our `Forms.Checker` class through the `Forms.IChecker` interface.

A `Forms.Field` is instanciated with an object with some specific keys:

- `field`

    optional, the name of the field.

    When set, defines a field in the collection schema, a column in the tabular display, an input element in the edition panel.

- `dt_tabular`

    optional, whether to have this field in the columns of a tabular display, defaulting to `true`.

    The whole field definition is ignored from tabular point of view when `dt_tabular` is false.

- `dt_data`

    optional, whether to have this field as a data subscription in a tabular display, defaulting to `true` if a `field` is set.

    A named field defaults to be subscribed to by a tabular display. This option prevents to have a useless data subscription.

All `SimpleSchema` keys can be set in this field definition, and will be passed to the `SimpleSchema()` instanciation.

All `Datatables` column options are to be be passed with a `dt_` prefix.

All `Forms.Checker` keys must be passed with a `form_` prefix.

### Blaze components

#### `coreFieldCheckIndicator`

Display an indicator about the validity status of a field.

Parameters:

- type: a `Forms.CheckResult` constant as `INVALID`, `NONE`, `UNCOMPLETE` or `VALID`.

#### `coreFieldTypeIndicator`

Display an indicator about the type of a field.

Parameters:

- type: a `Forms.FieldType` constant as `INFO`, `SAVE` or `WORK`
- classes: if set, a list of classes to be added to the default ones.

## Configuration

The package's behavior can be configured through a call to the `Forms.configure()` method, with just a single javascript object argument, which itself should only contains the options you want override.

Known configuration options are:

- `checkStatusShow`

    Whether input fields should have a check status (valid/uncomplete/invalid) indicator, where available values are:

    - `Forms.C.CheckStatus.Show.NONE`

        Do not show any status indicator

    - `Forms.C.CheckStatus.Show.BOOTSTRAP`

        Uses the [Bootstrap](https://getbootstrap.com/) classes to indicate the status. Only applies to fields.

    - `Forms.C.CheckStatus.Show.INDICATOR`

        Uses an icon indicator.

        On fields, the package is able to automatically append the indicator on the right of the field.

        At the panel level, the caller must use a `FormsCheckStatusIndicator` template to position the indicator according to its wishes.

    Defaults to `Forms.C.CheckStatus.Show.INDICATOR`.

    `pwix:forms` is able to automagically add a status indicator on the right of each field, unless this feature is disabled by the package configuration, or at the `Checker` level, or individually for each field.

    If the caller wishes an indicator at the panel, it can use, in place or besides of fields indicators, the `FormsCheckStatusIndicator` Blaze template.

- `checkStatusOverridable`

    Whether the previous `checkStatusShow` is overridable when instanciating a `Checker` or specifying a field in the panel.

    Defaults to `true`.

- `displayFieldTypeIndicator`

    Whether input fields should default to be prefixed with a type (mandatory/optional) indicator.

    Defaults to `true`.

    This default value can be overriden at the field specification level.

- `verbosity`

    Define the expected verbosity level.

    The accepted value can be any or-ed combination of following:

    - `Forms.C.Verbose.NONE`

        Do not display any trace log to the console

    - `Forms.C.Verbose.CONFIGURE`

        Trace `Forms.configure()` calls and their result

Please note that `Forms.configure()` method should be called in the same terms both in client and server sides.

Remind too that Meteor packages are instanciated at application level. They are so only configurable once, or, in other words, only one instance has to be or can be configured. Addtionnal calls to `Forms.configure()` will just override the previous one. You have been warned: **only the application should configure a package**.

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
