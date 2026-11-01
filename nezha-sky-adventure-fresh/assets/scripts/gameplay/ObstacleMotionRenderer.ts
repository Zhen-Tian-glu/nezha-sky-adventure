import { Color, Graphics } from 'cc';
import { MotionFrame } from './ObstacleMotion';

/** Render only primitives inside the solid danger body; never transforms a collider. */
export function drawMotionFrame(graphics: Graphics, frame: MotionFrame, offsetX = 0): void {
    for (const primitive of frame.primitives) {
        const color = new Color(...primitive.color);
        if (primitive.kind === 'circle') {
            graphics.fillColor = color;
            graphics.circle(primitive.x + offsetX, primitive.y, primitive.radius);
            graphics.fill();
        } else {
            if (!primitive.points.length) continue;
            if (primitive.kind === 'stroke') {
                graphics.strokeColor = color;
                graphics.lineWidth = primitive.width;
            } else graphics.fillColor = color;
            graphics.moveTo(primitive.points[0].x + offsetX, primitive.points[0].y);
            for (let i = 1; i < primitive.points.length; i++) {
                graphics.lineTo(primitive.points[i].x + offsetX, primitive.points[i].y);
            }
            if (primitive.kind === 'stroke') graphics.stroke();
            else { graphics.close(); graphics.fill(); }
        }
    }
}
