import { MyReact } from './utils';

/** @jsx MyReact.createElement */
const element = (
  <div id="foo">
    <h1>bar</h1>
    <span>test</span>
  </div>
);

const container = document.getElementById('root');
MyReact.render(element, container);

setTimeout(() => {
  /** @jsx MyReact.createElement */
  const elementNew = (
    <div id="foo">
      <h1>bar</h1>
      <div>test2</div>
    </div>
  );

  MyReact.render(elementNew, container);
}, 5000);
