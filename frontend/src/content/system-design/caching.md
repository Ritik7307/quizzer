# Caching Strategies

Caching is the process of storing copies of files or data in a temporary storage location (cache) for faster access. In distributed systems, caching is the single most effective way to improve read performance and reduce database load.

## Where to Cache?
- **Client/Browser Cache:** Storing static assets (images, CSS) locally on the user's device.
- **CDN (Content Delivery Network):** Caching static media geographically close to the user (e.g., Cloudflare, AWS CloudFront).
- **Web Server Cache:** Reverse proxies like Varnish or NGINX.
- **Application Cache:** In-memory stores like Redis or Memcached placed between your application servers and your database.

## Cache Eviction Policies

When the cache gets full, you must evict old data to make room for new data.

1. **LRU (Least Recently Used):** Evicts the item that hasn't been accessed for the longest time. This is the most common policy.
2. **LFU (Least Frequently Used):** Evicts the item that has been accessed the fewest number of times.
3. **FIFO (First In, First Out):** Evicts the oldest item in the cache, regardless of how often it is accessed.

## Cache Updating Strategies

### 1. Cache-Aside (Lazy Loading)
The application checks the cache first. If the data is missing (cache miss), it fetches it from the database, saves it to the cache, and returns it.
- **Best for:** Read-heavy workloads.

### 2. Write-Through
The application writes data to the cache AND the database simultaneously.
- **Best for:** Systems where data must not be lost and absolute consistency between cache and DB is required.

### 3. Write-Back (Write-Behind)
The application writes data only to the cache and immediately acknowledges the request. A background process syncs the cache to the database asynchronously.
- **Best for:** Write-heavy workloads (e.g., tracking YouTube views). High risk of data loss if the cache server crashes before syncing.
