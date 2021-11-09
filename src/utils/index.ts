import { Tags } from "../faces";

export const getTagByName = (name: string, tags?: Tags): string | undefined => {
  if (tags) {
    const tag = tags.find((tag) => tag.name === name);

    if (tag) {
      return tag.value;
    }
  }

  return undefined;
};
