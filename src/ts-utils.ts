import { Vector3 } from "three";

export class MeshUtils{
    static normal(edgeA: Vector3, edgeB: Vector3): Vector3{
        let crossed: Vector3 = edgeA.clone().cross(edgeB);
        return crossed.normalize();
    }

    static edges(vertexA: Vector3, vertexB: Vector3, vertexC: Vector3): Vector3[]{
        const edgeA: Vector3 = vertexA.clone().sub(vertexB);
        const edgeB: Vector3 = vertexB.clone().sub(vertexC);
        const edgeC: Vector3 = vertexC.clone().sub(vertexA);

        return [edgeA, edgeB, edgeC];
    }
}