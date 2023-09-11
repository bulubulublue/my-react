import { MyReact } from './utils';

// =====================================测试用===============================

/** @jsx MyReact.createElement */
const element = (
  <div id="foo">
    <h1>bar</h1>
    <span>test</span>
  </div>
);

const container = document.getElementById('root');
MyReact.render(element, container);
