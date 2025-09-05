Good practices when using spot instances in [[Databricks]].

- **Head Node** should always be **On-Demand** to avoid full cluster failure if evicted.
- **Worker Nodes** can be **Spot Instances** to save 60–90% in cost.
- If a Spot worker is evicted:
    - Only that node is lost.
    - Tasks are retried on remaining nodes (if any).
    - No new nodes are launched **unless autoscaling is enabled**.
- **Fallback to On-Demand** ensures that if Spot capacity is unavailable or evicted, Databricks automatically replaces it with an On-Demand instance.
* You can choose a minimum number of nodes to be On-Demand to ensure compute stability. For more details, refer to [azure_attributes.first_on_demand in the create cluster API](https://docs.databricks.com/api/azure/workspace/clusters/create#azure_attributes-first_on_demand).
- Eviction rates vary by region and VM type in Azure. You can view estimates during cluster setup or via Azure APIs.