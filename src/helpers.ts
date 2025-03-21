/*Copyright (c) 2024 Sven Uhlig git@resident-uhlig.de
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
The Software shall be used for Good and must NOT be used for Evil.
The Software must NOT be used to operate nuclear facilities, weapons, things
owned by a state or its contractors, life support or mission-critical
applications where human life or property may be at stake.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.*/
import {
    buildShape,
    Curve,
    Image,
    isCurve,
    isImage,
    isLine,
    isShape,
    Item,
    Line,
    Math2,
    Shape,
} from "@owlbear-rodeo/sdk";
import { Vector2 } from "@owlbear-rodeo/sdk";

interface Rectangle extends Shape {
    shapeType: "RECTANGLE";
}

const isRectangle = (shape: Shape): shape is Rectangle => {
    return shape.shapeType === "RECTANGLE";
};

interface Circle extends Shape {
    shapeType: "CIRCLE";
}

const isCircle = (shape: Shape): shape is Circle => {
    return shape.shapeType === "CIRCLE";
};

interface Triangle extends Shape {
    shapeType: "TRIANGLE";
}

const isTriangle = (shape: Shape): shape is Triangle => {
    return shape.shapeType === "TRIANGLE";
};

interface Hexagon extends Shape {
    shapeType: "HEXAGON";
}

const isHexagon = (shape: Shape): shape is Hexagon => {
    return shape.shapeType === "HEXAGON";
};

const scale = (point: Vector2, center: Vector2, scale: Vector2) => {
    return {
        x: (point.x - center.x) * scale.x + center.x,
        y: (point.y - center.y) * scale.y + center.y,
    };
};

const rotate = (point: Vector2, center: Vector2, degree: number) => {
    const radians = deg2rad(degree);
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
        x: dx * cos - dy * sin + center.x,
        y: dy * cos + dx * sin + center.y,
    };
};

const deg2rad = (degree: number) => {
    return (degree / 180) * Math.PI;
};

// Can't get bounding box of Text or Path because too complex.
// Work-around using OBR's native functions doesn't work for players because
// they can't get bounding boxes of hidden items.
export type SupportedItem = Curve | Line | Image | Shape;

export function isSupported(item: Item): item is SupportedItem {
    return isCurve(item) || isLine(item) || isImage(item) || isShape(item);
}

export default async function getItemBounds(item: SupportedItem) {
    if (isCurve(item)) {
        return getCurveBoundingBox(item);
    }

    if (isLine(item)) {
        return getLineBoundingBox(item);
    }

    if (isImage(item)) {
        return getImageBoundingBox(item);
    }

    if (isShape(item)) {
        return getShapeBoundingBox(item);
    }

    throw `unsupported item type`;
}

async function getCurveBoundingBox(curve: Curve) {
    const boundingBox = Math2.boundingBox(curve.points);

    const radians = deg2rad(curve.rotation);
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);

    const dx = -boundingBox.center.x * curve.scale.x;
    const dy = -boundingBox.center.y * curve.scale.y;

    const originalPosition = {
        x: boundingBox.center.x + dx * cos - dy * sin,
        y: boundingBox.center.y + dy * cos + dx * sin,
    };

    const offset = {
        x: curve.position.x - originalPosition.x,
        y: curve.position.y - originalPosition.y,
    };

    const points = curve.points.map((point) => {
        const scaled = scale(point, boundingBox.center, curve.scale);
        const rotated = rotate(scaled, boundingBox.center, curve.rotation);
        return {
            x: rotated.x + offset.x,
            y: rotated.y + offset.y,
        };
    });

    return Math2.boundingBox(points);
}

async function getLineBoundingBox(line: Line) {
    const points = [
        {
            x: line.position.x + line.startPosition.x,
            y: line.position.y + line.startPosition.y,
        },
        {
            x: line.position.x + line.endPosition.x,
            y: line.position.y + line.endPosition.y,
        },
    ];

    return Math2.boundingBox(points);
}

async function getImageBoundingBox(image: Image) {
    const scaleDpi = 150 / image.grid.dpi;
    const scaleX = scaleDpi * image.scale.x;
    const scaleY = scaleDpi * image.scale.y;

    const offsetX = image.grid.offset.x * scaleX;
    const offsetY = image.grid.offset.y * scaleY;

    const radians = deg2rad(image.rotation);
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);

    const rectangle = buildShape()
        .shapeType("RECTANGLE")
        .rotation(image.rotation)
        .width(image.image.width)
        .height(image.image.height)
        .scale({
            x: scaleX,
            y: scaleY,
        })
        .position({
            x: image.position.x - offsetX * cos + offsetY * sin,
            y: image.position.y - offsetY * cos - offsetX * sin,
        })
        .build();

    if (isRectangle(rectangle)) {
        return getRectangleBoundingBox(rectangle);
    }

    throw `shape doesn't look like a rectangle`;
}

async function getShapeBoundingBox(shape: Shape) {
    if (isCircle(shape)) {
        return getCircleBoundingBox(shape);
    }

    if (isHexagon(shape)) {
        return getHexagonBoundingBox(shape);
    }

    if (isRectangle(shape)) {
        return getRectangleBoundingBox(shape);
    }

    if (isTriangle(shape)) {
        return getTriangleBoundingBox(shape);
    }

    throw `shape.shapeType unsupported: ${shape.shapeType}`;
}

async function getCircleBoundingBox(circle: Circle) {
    const width = circle.width * circle.scale.x;
    const height = circle.height * circle.scale.y;
    const radius = Math.min(width, height) / 2;

    return {
        min: { x: circle.position.x - radius, y: circle.position.y - radius },
        max: { x: circle.position.x + radius, y: circle.position.y + radius },
        center: { x: circle.position.x, y: circle.position.y },
        width,
        height,
    };
}

async function getHexagonBoundingBox(hexagon: Hexagon) {
    const radius = (hexagon.width / 2) * hexagon.scale.x;
    const radians = deg2rad(hexagon.rotation);
    const corners = [
        Math.PI / 2,
        Math.PI / 6,
        (11 * Math.PI) / 6,
        (3 * Math.PI) / 2,
        (7 * Math.PI) / 6,
        (5 * Math.PI) / 6,
    ].map((angle) => {
        angle = angle + radians;
        return {
            x: hexagon.position.x + radius * Math.cos(angle),
            y: hexagon.position.y + radius * Math.sin(angle),
        };
    });

    return Math2.boundingBox(corners);
}

async function getRectangleBoundingBox(rectangle: Rectangle) {
    const radians = deg2rad(rectangle.rotation);
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);

    const rX = (rectangle.width / 2) * rectangle.scale.x;
    const rY = (rectangle.height / 2) * rectangle.scale.y;

    const center = {
        x: rectangle.position.x + rX * cos - rY * sin,
        y: rectangle.position.y + rY * cos + rX * sin,
    };

    const corners = [
        {
            x: center.x - rX * cos + rY * sin,
            y: center.y - rX * sin - rY * cos,
        },
        {
            x: center.x + rX * cos + rY * sin,
            y: center.y + rX * sin - rY * cos,
        },
        {
            x: center.x + rX * cos - rY * sin,
            y: center.y + rX * sin + rY * cos,
        },
        {
            x: center.x - rX * cos - rY * sin,
            y: center.y - rX * sin + rY * cos,
        },
    ];

    return Math2.boundingBox(corners);
}

async function getTriangleBoundingBox(triangle: Triangle) {
    const radians = deg2rad(triangle.rotation);
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);

    const halfWidth = (triangle.width / 2) * triangle.scale.x;
    const height = triangle.height * triangle.scale.y;

    const corners = [
        {
            x: triangle.position.x,
            y: triangle.position.y,
        },
        {
            x: triangle.position.x - halfWidth * cos - height * sin,
            y: triangle.position.y + height * cos - halfWidth * sin,
        },
        {
            x: triangle.position.x + halfWidth * cos - height * sin,
            y: triangle.position.y + height * cos + halfWidth * sin,
        },
    ];

    return Math2.boundingBox(corners);
}
