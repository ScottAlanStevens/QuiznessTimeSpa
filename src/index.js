import 'bootstrap/dist/css/bootstrap.css';
import { render } from 'react-dom';
import * as serviceWorker from './serviceWorker';
import HostPage from './host';
import PlayerPage from './player';
import React from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route
} from 'react-router-dom';

require('dotenv').config();

render((
    <Router>
        <Switch>
            <Route exact path='/' component={PlayerPage} />
            <Route exact path='/host' component={HostPage} />

        </Switch>
    </Router>), document.getElementById("root"));

serviceWorker.register();