const urlAlphabet =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export function customAlphabet(alphabet: string, defaultSize = 21) {
  return (size = defaultSize) => {
    let id = "";
    let i = size | 0;

    while (i--) {
      id += alphabet[(Math.random() * alphabet.length) | 0];
    }

    return id;
  };
}

export function nanoid(size = 21) {
  let id = "";
  let i = size | 0;

  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }

  return id;
}

export default { customAlphabet, nanoid };
