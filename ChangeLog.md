# pwix:forms

## ChangeLog

### 1.4.1-rc

    Release date: 

    - Update to pwix:ui-utils v1.4

### 1.4.0

    Release date: 2024-11-19

    - Introduce Forms.FieldType.C.TRANSPARENT so that NONE and TRANSPARENT are both possible and different semantics, thus bumping minor candidate version number
    - Extend crossCheckFn instanciation parameter to also accept an array of functions
    - Check functions now receive the Checker instance as an option member
    - Define new Checker.panel() and Panel.objectData() methods
    - Fix the crossChecks behaviours
    - Fix the Panel initialization
    - Define new Panel.byName()
    - Actually make the Field.Set optional when instanciating a Panel
    - No more cache the computed nodes to handle dynamic UIs
    - Minor spelling fixes
    - Remove useless aldeed:simple-schema dependency
    - Use margin instead of padding to keep the FormsStatusIndicator svg centered inside the button
    - Improve comments
    - Improve radio button management
    - Fix Checker.messagerClearMine() to bubble up in the hierarchy

### 1.3.0

    Release date: 2024-10- 4

    - Set INFO messages to have bs-primary color
    - Define new Checker.messagerClearMine() method, thus bumping minor candidate version number
    - Refactor all classes and interfaces to client side only
    - Remove meteor/check dependency
    - Introduce new Forms.C.ShowStatus.TRANSPARENT check status display constant
    - package.js refactoring
    - Fix ReactiveVar assertion when FormsCheckStatusIndicator is used outside of the iField interface
    - Rename FormsCheckStatusIndicator, FormsFieldTypeIndicator components to FormsStatusIndicator, FormsTypeIndicator
    - CheckStatus definition (as None, Invalid, Uncomplete, Valid) is renamed to FieldStatus
    - CheckStatus configuration parameter (as None, Bootstrap, Indicator, Transparent) is renamed to ShowStatus
    - 'checkStatusShow' Checker parameter is renamed to 'fieldStatusShow'
    - 'displayFieldTypeIndicator' Checker parameter is renamed to 'fieldTypeShow'
    - 'checkStatusOverridable' configuration parameter is renamed to 'showStatusOverridable'
    - Introduce new 'showTypeOverridable' configuration parameter
    - Fix the computing of whether display the indicators
    - Define new statusByFields() checker method
    - Fix configuration overrides
    - Fix null data context in FormsStatusIndicator component
    - Extend the FormsStatusIndicator component to be able to act as a button
    - Define 'crossCheckFn' parameter to Checker instanciation

### 1.2.0

    Release date: 2024- 9-20

    - Accept aldeed:simple-schema v2.0.0, thus bumping minor candidate version number
    - Define FieldType.C.NONE
    - Define new Checker.name() method

### 1.1.0

    Release date: 2024- 9-13

    - Improve README
    - Let the Checker be named to make the debug easyer, thus bumping the minor candidate version number
    - Let the Checker be disabled
    - Change the optional icon
    - Fix Checker/enabled() getter
    - Stop the hierarchy up propagation when a checker is disabled
    - Make sure children are also checked
    - Checker.messagerPush() now defaults to be self-emitted
    - Fix IFieldRun._checkConsolidate() level usage
    - Honors checkStatusShow to modify the DOM context of each element field
    - Be tolerant when the HTML INPUT event emitter is a descendant of the JS-addressed node
    - Introduce iMessagerFirst() method
    - Remove (unused) iSpecValueTo() method
    - Fix the messages level comparison
    - Fix the messages ordering to get the highest severity first
    - Define new Checker.clearPanel() method

### 1.0.2

    Release date: 2024- 8-11

    - Define itemFrom() itemTo() definition functions

### 1.0.1

    Release date: 2024- 7-17

    - Improve display of check status indicator

### 1.0.0

    Release date: 2024- 7-10

    - Initial release

---
P. Wieser
- Last updated on 2024, Nov. 19th
