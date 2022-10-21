

svg_header = '<svg id="ey7A5Oasubt1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" shape-rendering="geometricPrecision" text-rendering="geometricPrecision"><rect width="64" height="64" rx="4" ry="4" stroke-width="0"/>{0}</svg>'

shapes = {
    'asterisk': '<polygon points="-2.056722,-26.099003 1.157819,-9.859591 14.913841,-19.069566 5.703866,-5.313544 21.943278,-2.099003 5.703866,1.115538 14.913841,14.87156 1.157819,5.661585 -2.056722,21.900997 -5.271263,5.661585 -19.027285,14.87156 -9.81731,1.115538 -26.056722,-2.099003 -9.81731,-5.313544 -19.027285,-19.069566 -5.271263,-9.859591 -2.056722,-26.099003" transform="translate(34.056722 34.099003)" fill="{0}" stroke-width="2" stroke="white"/>',
    'cross': '<polygon points="-2.056722,-26.099003 3.882975,-8.0387 21.943278,-2.099003 3.882975,3.840694 -2.056722,21.900997 -7.996419,3.840694 -26.056722,-2.099003 -7.996419,-8.0387 -2.056722,-26.099003" transform="matrix(.707107 0.707107-.707107 0.707107 31.970102 34.938542)" fill="{0}" stroke-width="2" stroke="white"/>',
    'star': '<polygon points="-0.821627,-26.099003 5.85314,-9.225069 23.178373,-7.764635 9.978373,4.124465 14.011189,21.900997 -0.821627,12.374931 -15.654443,21.900997 -11.621627,4.124465 -24.821627,-7.764635 -7.496394,-9.225069 -0.821627,-26.099003" transform="translate(32.821627 34.099003)" fill="{0}" stroke-width="2" stroke="white"/>',
    'circle': '<ellipse rx="24" ry="24" transform="translate(32 32)" fill="{0}" stroke-width="2" stroke="white"/>',
    'square': '<rect width="40" height="40" rx="1" ry="1" transform="translate(12 12)" fill="{0}" stroke-width="2" stroke="white"/>',
    'plus': '<rect width="16" height="48" rx="8" ry="8" transform="translate(24 8)" fill="{0}" stroke-width="2" stroke="white"/><rect width="48" height="16" rx="8" ry="8" transform="translate(8 24)" fill="{0}" stroke-width="2" stroke="white"/>',
    'diamond': '<rect width="32" height="32" rx="1" ry="1" transform="matrix(.707107 0.707107-.707107 0.707107 32 9.372583)" fill="{0}" stroke-width="2" stroke="white"/>',
}

svg_template = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0{0}" fill="{1}"><rect width="{3}" height="{3}" rx="{4}" ry="{4}" fill="black" stroke-width="0"/><path d="{2}"/></svg>'


def gen_shape(viewBox, color, d, r1, r2):
    return svg_template.format(viewBox, color, d, r1, r2)


def getColor(colorId):
    hues = [0, 30, 50, 120, 200, 270]
    color = [
        hues[colorId],
        100,
        50
    ]
    return 'hsl({0},{1}%,{2}%)'.format(*color)


colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']

for i, color in enumerate(colors):
    for shape, data in shapes.items():
        print(shape, color)
        svg = svg_header.format(data.format(getColor(i)))

        f = open("./assets/tiles/{0}_{1}.svg".format(color, shape), "w")
        f.write(svg)
        f.close()

f = open("./shape_colors.css", "w")

for color in colors:
    for shape in shapes.keys():
        s = '.cs-{0}-{1} {{\n'.format(color, shape)
        url = "./assets/tiles/{0}_{1}.svg".format(color, shape)
        s += '\tbackground-image: url({});\n'.format(url)
        s += '}\n\n'
        print(s)
        f.write(s)


f.close()
print('\n')
