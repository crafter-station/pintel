export const DRAWING_PROMPTS = [
  "a cat playing piano",
  "a robot cooking spaghetti",
  "a penguin surfing",
  "a dinosaur reading a book",
  "a ghost drinking coffee",
  "an astronaut riding a unicorn",
  "a dragon baking cookies",
  "a wizard using a laptop",
  "a pirate with a parrot doing yoga",
  "a sloth running a marathon",
  "a cactus giving a hug",
  "a shark wearing a top hat",
  "a giraffe in a tiny car",
  "a bear making pizza",
  "an octopus playing drums",
  "a fox teaching math",
  "a koala doing karate",
  "a flamingo on a skateboard",
  "a snail with rocket boots",
  "a llama at a disco",
];

export function getRandomPrompt(): string {
  return DRAWING_PROMPTS[Math.floor(Math.random() * DRAWING_PROMPTS.length)];
}
