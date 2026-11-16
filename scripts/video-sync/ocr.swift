import Foundation
import Vision
import AppKit
// Usage: ocr <image> ; prints recognised text lines with their box (x,y normalised, origin bottom-left)
let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("ERR load"); exit(1) }
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = false
let h = VNImageRequestHandler(cgImage: cg, options: [:])
try h.perform([req])
for o in req.results ?? [] {
  if let t = o.topCandidates(1).first { print(String(format: "%.3f %.3f\t%@", o.boundingBox.minX, o.boundingBox.minY, t.string)) }
}
