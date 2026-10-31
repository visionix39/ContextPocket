# AI Agents: Course Notes

Notes from an introductory course on building LLM-powered agents.

## What is an agent?

An agent is a system that uses a language model as its reasoning engine to decide which
actions to take, observes the results, and keeps going until a goal is met. The model
alone can only produce text; the agent framework around it gives the model tools, memory
and a loop. A plain chatbot answers one message at a time; an agent plans, acts and
checks its own progress.

## The Thought–Action–Observation loop

Most agents run a cycle:

1. **Thought**: the model reasons about the current state and decides what to do next.
2. **Action**: the agent calls a tool, e.g. a web search, calculator or database query,
   with arguments the model produced.
3. **Observation**: the tool's result is appended to the context so the model can read it.

The loop ends when the model emits a final answer instead of another action. ReAct
("Reason + Act") is the prompting pattern that interleaves these steps explicitly and was
shown to reduce hallucination compared with reasoning alone, because claims can be
checked against tool output.

## Tools and function calling

A tool is a function with a name, a natural-language description and a JSON schema for
its arguments. The description matters enormously: the model chooses tools based on it.
Modern APIs support structured function calling, where the model returns a JSON object
naming the tool and arguments instead of free text, which removes brittle regex parsing.
Good practice: keep tools small and single-purpose, validate arguments before executing,
and return concise, structured observations rather than huge raw dumps.

## Memory

Short-term memory is just the conversation context window. Long-term memory stores
information outside the context, typically as embeddings in a vector database, and
retrieves relevant pieces on demand. Retrieval-augmented generation (RAG) is this
pattern applied to documents: embed the query, find the nearest chunks, and put them in
the prompt so the model answers from sources instead of from memory. Chunking strategy
and retrieval quality usually matter more than the choice of model.

## Planning

Simple agents decide one step at a time. Planning agents first write a multi-step plan
and then execute it, sometimes revising the plan after observations. Decomposing a hard
task into subtasks improves reliability but costs more tokens and latency. A common
compromise is to plan loosely and re-plan only when an action fails.

## Evaluation

Agents are evaluated on task success rate rather than on text similarity. Build a small
benchmark of tasks with known answers, run the agent, and measure how often it finishes
correctly, how many tool calls it used and how much it cost. Trace every run so failures
can be inspected step by step; most bugs are prompt or tool-description problems rather
than model problems. Because LLM output is stochastic, repeat runs and report averages.

## Safety and guardrails

Give agents the minimum permissions they need. Treat tool output as untrusted data: a
web page can contain text that tries to instruct the model (prompt injection). Add
confirmation steps before irreversible actions, cap the number of loop iterations to
avoid runaway costs, and log everything.
