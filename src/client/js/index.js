/*
 * pwix:forms/src/client/js/index.js
 */

import '../../common/js/index.js';

// provides base classes to Forms global object
import { Checker } from '../classes/checker.class';
import { Messager } from '../classes/messager.class.js';
import { PanelSpec } from '../classes/panel-spec.class';

import { IMessager } from '../interfaces/imessager.iface';

import '../stylesheets/forms.less';

Forms.Checker = Checker;
Forms.PanelSpec = PanelSpec;
Forms.Messager = Messager;

Forms.IMessager = IMessager;
