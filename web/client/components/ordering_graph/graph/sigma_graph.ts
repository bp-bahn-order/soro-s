//@ts-nocheck
import { DirectedGraph } from "graphology";
import Sigma from "sigma";
import { sendRequest, sendPostData } from "../api/api_graph";
import { rendererSettings, edgeSettings, nodeColor, edgeColor, edgeOnHoverColor } from "./settings";
import { subgraph } from "graphology-operators";
import _ from "lodash";


export class SigmaGraphCreator {
    rootElement: HTMLElement;
    sigmaContainer: HTMLElement;
    search: HTMLElement;
    searchInput: HTMLInputElement;
    searchSuggestions: HTMLDataListElement;
    renderer: Sigma<DirectedGraph>;
    maxTrainLength: number;
    nodesForGivenTrainId: Map<number, Array<string>>;
    nodesForGivenRouteId: Map<number, Array<string>>;

    addEventListener: any;
    graph: DirectedGraph;
    neighborInput: HTMLInputElement;

    constructor(rootElement: HTMLElement) {
        this.rootElement = rootElement;
        this.sigmaContainer = rootElement.querySelector('#sigma-container') as HTMLElement;
        this.searchInput = rootElement.querySelector('#search-input') as HTMLInputElement;
        this.neighborInput = rootElement.querySelector("#neighbor-input") as HTMLInputElement;
        this.search = rootElement.querySelector('#search') as HTMLElement;
        this.maxTrainLength = 0;
        this.nodesForGivenTrainId = new Map<number, Array<string>>();
        this.nodesForGivenRouteId = new Map<number, Array<string>>();
        this.graph = new DirectedGraph();
        this.getInitGraph(this.graph);
        

        this.searchInput.addEventListener('input', (e) => {
            this.processInput();
        });
        this.neighborInput.addEventListener('input', (e) => {
            this.processInput();
        });

    };

    private processInput() {
        if (this.searchInput.value !== "") {
            if (this.renderer !== undefined) {
                this.destroySigmaGraph();
            }
            this.maxTrainLength = 0;

            this.createPartialGraph(this.graph, parseInt(this.searchInput.value), parseInt(this.neighborInput.value));
        }
    }



    private getRelevantTrainIds(graph: DirectedGraph, trainId: number, neighborDegree: number) {
        let result = new Set<number>();
        result.add(trainId);
        let temp = result;

        for (let i = 0; i < neighborDegree; i++) {
            temp = this.getNeighborTrainIds(graph, temp);
            result = new Set([...result, ...temp]);
        }
        return result;
    }

    private getNeighborTrainIds(graph: DirectedGraph, trainIds: Set<number>) {
        let result = new Set<number>();
        _.each([...trainIds], trainId => {
            _.each([... this.nodesForGivenTrainId.get(trainId)], node => {
                graph.forEachNeighbor(node, neighbor => {
                    if (graph.getNodeAttribute(node, "t") != graph.getNodeAttribute(neighbor, "t")) {
                        result.add(graph.getNodeAttribute(neighbor, "t"));
                    }
                });
            })
        });

        return new Set(_.uniq([...result]));
    }


    // puts a whole train into the graph
    private getRelevantNodes(relevantTrainIds: Set<number>): Set<string> {
        let allNodes = new Set<string>();
        _.each([...relevantTrainIds], trainId => {
            const nodesOfCurrentTrainId = this.nodesForGivenTrainId.get(trainId);
            this.maxTrainLength = this.maxTrainLength < nodesOfCurrentTrainId!.length ? nodesOfCurrentTrainId!.length : this.maxTrainLength;
            _.each([... nodesOfCurrentTrainId], node => allNodes.add(node));
        });
        return allNodes;
    }

    private createSigmaGraph(json, graph) {
        console.time("import");
        this.unsafeImport(json, graph);
        console.timeEnd("import");
    }

    private createPartialGraph(graph, trainId, neighborDegree) {
        console.time("filter");

        let allTrainIds = this.getRelevantTrainIds(graph, trainId, neighborDegree);
        const numberOfTrains = allTrainIds.size;
        allTrainIds = [...allTrainIds].sort((a, b) => a - b);
        
        const nodeSet = this.getRelevantNodes(allTrainIds);
        
        const smallGraph = subgraph(graph, nodeSet);

        this.setGraphAttributes(smallGraph, numberOfTrains);
        this.renderer = new Sigma(smallGraph, this.sigmaContainer, rendererSettings);
        this.setEventHandler(smallGraph);
        console.timeEnd("filter");
    }



    private setGraphAttributes(graph: DirectedGraph, numberOfTrains: number) {
        this.setNodeAttributes(graph, numberOfTrains);
        this.setEdgeAttributes(graph);
    }

    private setNodeAttributes(graph: DirectedGraph, numberOfTrains: number) {
        let lastTrainId = null;
        let ratio = this.maxTrainLength/numberOfTrains;
        let xPosition = 0;
        let yPosition = -1;

        let xSpacing = 500;
        let ySpacing = 500;

        graph.forEachNode((node) => {
            const currentTrainId = graph.getNodeAttribute(node, "t");
            const labelName = "Train:" + currentTrainId + " Route:" + graph.getNodeAttribute(node, "r");


            if (lastTrainId != currentTrainId) {
                xPosition = 0;
                yPosition++;
            }
            else {
                xPosition++;
            }
            lastTrainId = currentTrainId;
            graph.setNodeAttribute(node, "x", xPosition * xSpacing * 1.4)
                .setNodeAttribute(node, "y", yPosition * ySpacing * ratio)
                .setNodeAttribute(node, "label", labelName)
                .setNodeAttribute(node, "color", nodeColor)
                .setNodeAttribute(node, "size", 2)
                .setNodeAttribute(node, "type", "base");
        });
    }

    private setEdgeAttributes(graph: DirectedGraph) {
        graph.forEachEdge((edge) => {
            this.edgeAttributes(graph, edge);
        });
    }

    private isRouteEdge(graph: DirectedGraph, edge): boolean {
        const source = graph.source(edge);
        const target = graph.target(edge);
        const sourceTrainId = graph.getNodeAttribute(source, "t");
        const targetTrainId = graph.getNodeAttribute(target, "t");
        return sourceTrainId !== targetTrainId;
    }

    private edgeAttributes(graph: DirectedGraph, edge) {
        graph.mergeEdgeAttributes(edge, edgeSettings);
    }


    //---- renderer methods ----

    private setEventHandler(graph: DirectedGraph) {
        this.invertEdge(graph);
        this.highlightHoveredEdge(graph);
    }

    public resizeSigmaGraph() {
        if (this.renderer !== undefined) {
            this.renderer.refresh();
        }
        else {
            console.log("graph doesn't exist!");
        }
    }

    public destroySigmaGraph() {
        if (this.renderer !== undefined) {
            this.renderer.clear();
            this.renderer.kill();
        }
    }


    private highlightHoveredEdge(graph: DirectedGraph) {
        this.renderer.on("enterEdge", ({ edge }) => {
            graph.setEdgeAttribute(edge, "color", edgeOnHoverColor);
        });
        this.renderer.on("leaveEdge", ({ edge }) => {
            graph.setEdgeAttribute(edge, "color", edgeColor);
        })
    }

    private invertEdge(graph: DirectedGraph) {
        this.renderer.on("clickEdge", (event) => {
            if (this.isRouteEdge(graph, event.edge)) {
                const edgeInformation: Array<string> = [graph.source(event.edge), graph.target(event.edge)];
                this.getUpdatedGraph(edgeInformation, graph);
            }
        });
        this.renderer.refresh();
    }

    //---- data handling ----

    /**
     * requests the random generated graph from the server
     */
    private getInitGraph(graph: DirectedGraph) {
        sendRequest({ url: '/api/ordering_graph/' })
            .then(response => response.json())
            .then(json =>
                this.createSigmaGraph(json, graph));
    }
    

    /**
     * requests the updated graph after reversing an edge
     * @param edgeInformation source and target of the edge which should be reversed
     * @param graph 
     */
    private getUpdatedGraph(edgeInformation: Array<string>, graph: DirectedGraph) {
        sendPostData({ url: '/api/ordering_graph/invert', data: graph, values: edgeInformation })
            .then(response => response.json())
            .then(json =>
                this.createSigmaGraph(json, graph));
    }


    /**
     * Unsafe Version of the Graphology import Function, removed checks and personalized json processing to make it faster
     * @param data json format:
     * {
        //general graph attributes
        "a": {},
        // nodes 
        "n": [
            // string: key of the node  first number: route_id of the node  second number: train_id of the node
            [string, number, number]
        ],
        // edges
        "e": [
            // first string: source, second: target
            [string, string]
        ]
       }
     * 
     * @param graph empty graph to fill with data
     * @returns the graph with the imported data
     */
    private unsafeImport(data, graph: DirectedGraph) {
        // Importing a serialized graph    
        if (data.a) {
            graph.replaceAttributes(data.a);
        }

        let i, l;

        if (data.n) {            

            for (i = 0, l = data.n.length; i < l; i++) {
                
                // Adding the node
                const r = data.n[i][1]; 
                const t = data.n[i][2];

                graph.addNode(data.n[i][0], {r, t});
                this.nodesForGivenTrainId.get(t) === undefined ? this.nodesForGivenTrainId.set(t, [data.n[i][0]]) : this.nodesForGivenTrainId.get(t).push(data.n[i][0]);
                this.nodesForGivenRouteId.get(r) === undefined ? this.nodesForGivenRouteId.set(r, [data.n[i][0]]) : this.nodesForGivenRouteId.get(r).push(data.n[i][0]);
            }
        }

        if (data.e) {
            let undirectedByDefault = false;
            

            for (i = 0, l = data.e.length; i < l; i++) {
                
                // Adding the edge
                
                graph.addDirectedEdgeWithKey(i, data.e[i][0], data.e[i][1]);

            }
        }
        return graph;
    }


}
