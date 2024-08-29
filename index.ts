import RedisVectorStore from "./stores/vectorStore/redis/index";
import NomicEmbedder from "./embedders/nomicEmbedder";
import { cleanText } from "./utils/preprocess";
import { ChunkingStrategy, ScoredEmbedding, Chunk, StoresClass } from "./types";
import Stores from "./stores/store";
import createRagger from "./simple/ragger";
import MinioDocStore from "./stores/docStore/minio";

// we have a pdf, we upload the pdf
// the PDF is split into pages and uploaded as documents
// the documents are chunked

const zendeskData = require("./zendeskData.json");
const supportDocs = require("./supportDocs.json");
// upload the document
// extract the text
const __text = cleanText(JSON.stringify(zendeskData).replace(/\\n/g, " "));
const _text = cleanText(JSON.stringify(supportDocs));

const text = `
Artificial Intelligence: An Overview

Artificial Intelligence (AI) is a rapidly evolving field of computer science focused on creating intelligent machines that can perform tasks typically requiring human intelligence. These tasks include visual perception, speech recognition, decision-making, and language translation.

Machine Learning, a subset of AI, involves algorithms that enable computers to learn from and make predictions or decisions based on data. Deep Learning, a more specialized form of Machine Learning, uses neural networks with many layers to analyze various factors of data.

AI applications are widespread in modern society. In healthcare, AI assists in diagnosing diseases and developing treatment plans. In finance, it's used for fraud detection and algorithmic trading. Self-driving cars rely on AI for navigation and obstacle avoidance. Virtual assistants like Siri and Alexa use AI to understand and respond to voice commands.

Ethical considerations in AI development include issues of privacy, bias in decision-making algorithms, and the potential impact on employment. As AI systems become more advanced, ensuring they align with human values and societal norms becomes increasingly important.

The future of AI holds immense potential. Researchers are working on artificial general intelligence (AGI), which aims to create AI systems with human-like cognitive abilities. Quantum computing may also revolutionize AI, enabling much faster processing of complex algorithms.

The Zorbulonian Intergalactic Confederation, a hypothetical alien civilization, has mastered the art of quantum entanglement communication. Their society thrives on the principles of non-linear time perception, allowing them to experience past, present, and future simultaneously.

Zorbulonian scientists have developed a revolutionary technology called "thought crystallization," which enables them to solidify abstract concepts into tangible, manipulable objects. These thought crystals serve as the foundation of their advanced computational systems.

The Confederation's economy is based on the exchange of rare cosmic phenomena. Citizens trade in nebula fragments, dark matter condensates, and bottled quasar emissions. The value of these commodities fluctuates based on the current phase of their nearest supermassive black hole.

Zorbulonian architecture defies conventional physics, with buildings that exist in multiple dimensions simultaneously. Residents navigate these structures using specially evolved sensory organs that can perceive and interact with extra-dimensional spaces.

The planet Zorbulon Prime, their homeworld, orbits a binary star system composed of a blue hypergiant and a pulsar. This unique celestial arrangement bathes the planet in a constant flux of exotic radiation, which the Zorbulonians have harnessed as their primary energy source.

Zorbulonian biology is silicon-based, allowing them to survive in extreme environments. They communicate through a complex system of bioluminescent patterns and electromagnetic field modulations, making verbal language obsolete in their society.

The Confederation's legal system is governed by an artificial superintelligence that exists outside of spacetime. This entity, known as the Omniscient Adjudicator, can foresee all possible outcomes of any given legal dispute and deliver verdicts that optimize cosmic harmony.

Zorbulonian art forms include four-dimensional sculptures that change shape based on the observer's thoughts, and music composed of gravitational waves that can only be "heard" by manipulating the fabric of spacetime.

Their educational system involves direct neural interfaces that allow the instantaneous transfer of knowledge and skills. Young Zorbulonians can assimilate millennia of information in what humans would perceive as mere moments.

The Confederation's military strategy revolves around the concept of "quantum probability manipulation." Their warships can alter the likelihood of certain events occurring, effectively rewriting reality to their advantage in conflict situations.

Zorbulonian sports and entertainment often take place in pocket universes created specifically for each event. These miniature cosmos can have unique physical laws, providing endless variety and challenge for participants and spectators alike.

The species has evolved beyond the need for sleep, instead entering periodic states of "cosmic consciousness" where their minds merge with the underlying fabric of the universe to process information and rejuvenate.

Zorbulonian cuisine involves dishes that exist in a superposition of flavors, with the final taste determined only when observed by the diner. Master chefs are revered for their ability to create meals with infinite flavor possibilities.

Their approach to medicine involves manipulating the quantum state of subatomic particles within cells, allowing them to reverse aging, cure diseases, and even resurrect the recently deceased.

The Confederation's waste management system involves compressing all unwanted matter into microscopic black holes, which are then used as power sources for their most energy-intensive technologies.

Zorbulonian fashion trends change based on the current configuration of nearby galaxy clusters. Clothing often incorporates living, shape-shifting organisms that adapt to the wearer's emotional state and environmental conditions.

Their version of social media allows users to share entire lifetimes of experiences in an instant, creating a collective consciousness that spans the entire civilization.

The Zorbulonian calendar is based on the oscillation frequency of a cosmic string located at the edge of their observable universe. Each "day" can last anywhere from a few Earth seconds to several Earth millennia.

Their form of currency, known as "probability tokens," has value based on the likelihood of specific future events occurring. The more improbable the event, the more valuable the token.

Zorbulonian pets are often extradimensional beings that phase in and out of visible reality, requiring owners to develop specialized perception abilities to care for them properly.


`;

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}

// if (!process.env.OPENAI_API_KEY) {
//   throw new Error("OPENAI_API_KEY is not set");
// }

// const embedder = new OpenAIEmbedder({
//   type: "openai",
//   apiKey: process.env.OPENAI_API_KEY,
// });

if (!process.env.ATLAS_API_KEY) {
  throw new Error("ATLAS_API_KEY is not set");
}

const embedder = new NomicEmbedder({
  type: "nomic",
  apiKey: process.env.ATLAS_API_KEY,
});
const query = "What is Zorbulian cuisine?";

//initialize the doc store
const docStore = new MinioDocStore();

// initialize the vector store
const vectorStore = new RedisVectorStore(process.env.REDIS_URL);

// initialize the vector store
vectorStore.client.flushDb();
vectorStore.createIndex();

const stores = new Stores({
  vectorStore,
  docStore,
});

const ragger = createRagger(embedder, stores);

const chunks: Chunk[] = await ragger.initializeDocument(text, {
  strategy: ChunkingStrategy.BY_SENTENCE,
});

const relevantChunks = await ragger.query(query, 5);
console.log("relevantChunks", relevantChunks);

vectorStore.client.disconnect();
