import { customElement } from "solid-element";
import { createSignal } from "solid-js";

customElement("my-component", { name: "" }, (props) => {
  const [count, setCount] = createSignal(0);
  return (
    <div style="border:1px solid #ccc; padding:1rem;">
      Hello {props.name}! <br />
      <button onClick={() => setCount(count() + 1)}>Count: {count()}</button>
    </div>
  );
});
