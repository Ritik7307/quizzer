# Load Balancing in System Design

Load balancing is the process of distributing incoming network traffic across multiple servers to ensure no single server bears too much demand. By spreading the work evenly, load balancing improves application responsiveness and availability.

## Why is it required for FAANG?
At scale, a single server cannot handle millions of requests per second. Whether you are designing Netflix, Uber, or Twitter, a Load Balancer (LB) is the very first layer of scaling.

### Key Benefits:
- **High Availability:** If one server goes down, the LB redirects traffic to the remaining online servers.
- **Scalability:** You can add or remove servers dynamically without users noticing.
- **Performance:** Reduced latency by routing requests to the geographically closest or least-loaded server.

## Types of Load Balancing
1. **Layer 4 (Transport Layer):** Routes traffic based on IP address and TCP/UDP ports. It does not inspect the contents of the messages. (e.g., AWS Network Load Balancer).
2. **Layer 7 (Application Layer):** Routes traffic based on HTTP headers, URLs, or cookies. Much smarter but slightly more CPU intensive. (e.g., NGINX, AWS Application Load Balancer).

## Common Algorithms
- **Round Robin:** Requests are distributed across the group of servers sequentially.
- **Least Connections:** A new request is sent to the server with the fewest current connections.
- **IP Hashing:** The IP address of the client is used to determine which server receives the request. Useful for maintaining session persistence (Sticky Sessions).

### FAANG Interview Tip 💡
> When asked to design a globally distributed system, always place a **Global Server Load Balancer (GSLB)** at the DNS level to route users to the nearest data center, and then a **Local Load Balancer** within the data center to route to specific microservices!
