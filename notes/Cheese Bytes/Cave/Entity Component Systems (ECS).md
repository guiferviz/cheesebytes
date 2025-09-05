*Entity Component Systems (ECS)* is an architectural pattern used in game development and simulations to manage complex systems. They originate from a desire to simplify the [[Game Loop]]. It breaks down into three main parts:

1. **Entity**: A general-purpose object that serves as a container for components. It represents individual items or characters in the game world but does not contain any logic or data itself.
2. **Component**: A modular piece of data that defines specific attributes or behaviors of an entity. Components are reusable and can be attached to entities to give them specific properties, like position, velocity, or health.
3. **System**: A process that operates on entities with specific components. Systems contain the logic to manipulate the data in components, updating the state of entities based on game rules or interactions.

A great post explaining the motivation behind Entity Component Systems, very complete and with sample code: [Richard Lord's Blog on ECS](https://www.richardlord.net/blog/ecs/what-is-an-entity-framework).