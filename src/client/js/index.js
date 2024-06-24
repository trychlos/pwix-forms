/*
 * pwix:forms/src/client/js/index.js
 */

import '../../common/js/index.js';

// provides base classes to Forms global object
import { Checker } from '../classes/checker.class';
import { Panel } from '../classes/panel.class';

import '../stylesheets/forms.less';

Forms.Checker = Checker;
Forms.Panel = Panel;
