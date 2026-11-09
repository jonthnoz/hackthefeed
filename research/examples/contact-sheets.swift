import AppKit
import Foundation

struct ImageRecord: Decodable {
    let local: String
    let seconds: Double?
}
struct Content: Decodable {
    let id: String
    let creator: String
    let images: [ImageRecord]
}
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let records = try JSONDecoder().decode([Content].self, from: Data(contentsOf: root.appendingPathComponent("research/examples/media.json")))
let output = root.appendingPathComponent("research/examples/sheets")
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
for record in records {
    let frames = record.images.filter { $0.seconds != nil }
    for start in stride(from: 0, to: frames.count, by: 20) {
        let sheet = NSImage(size: NSSize(width: 1200, height: 1440))
        sheet.lockFocus()
        NSColor.white.setFill()
        NSRect(x: 0, y: 0, width: 1200, height: 1440).fill()
        let title = "\(record.creator) | indexed frames \(start)..<\(min(start + 20, frames.count))"
        (title as NSString).draw(at: NSPoint(x: 12, y: 1410), withAttributes: [.font: NSFont.systemFont(ofSize: 19), .foregroundColor: NSColor.black])
        for (offset, frame) in frames[start..<min(start + 20, frames.count)].enumerated() {
            let image = NSImage(contentsOf: root.appendingPathComponent("public\(frame.local)"))!
            let x = CGFloat(offset % 5) * 240
            let y = 1400 - CGFloat(offset / 5 + 1) * 350
            let scale = min(230 / image.size.width, 316 / image.size.height)
            image.draw(in: NSRect(x: x + 5, y: y + 29, width: image.size.width * scale, height: image.size.height * scale))
            let label = "f\(start + offset) | \(frame.seconds!)s"
            (label as NSString).draw(at: NSPoint(x: x + 5, y: y + 7), withAttributes: [.font: NSFont.monospacedSystemFont(ofSize: 16, weight: .regular), .foregroundColor: NSColor.black])
        }
        sheet.unlockFocus()
        let bitmap = NSBitmapImageRep(data: sheet.tiffRepresentation!)!
        let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.85])!
        try data.write(to: output.appendingPathComponent("\(record.id)-\(start / 20).jpg"))
    }
}
print("Saved indexed-frame contact sheets")
