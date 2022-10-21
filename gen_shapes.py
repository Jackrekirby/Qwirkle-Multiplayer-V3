

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


r = 1.3
rb = 0.1

shapes = {
    'square': ["M0 96C0 60.7 28.7 32 64 32H384c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96z", "0 0 448 512", 512 * r, 512 * r * rb],
    'circle': ["M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512z", "0 0 512 512", 512 * r, 512 * r * rb],
    'diamond': ["M284.3 11.7c-15.6-15.6-40.9-15.6-56.6 0l-216 216c-15.6 15.6-15.6 40.9 0 56.6l216 216c15.6 15.6 40.9 15.6 56.6 0l216-216c15.6-15.6 15.6-40.9 0-56.6l-216-216z", "0 0 512 512", 512 * r, 512 * r * rb],
    'asterisk': ["M208 0h96V172.9L453.7 86.4l48 83.1L352 256l149.7 86.4-48 83.1L304 339.1V512H208V339.1L58.3 425.6l-48-83.1L160 256 10.3 169.6l48-83.1L208 172.9V0z", "0 0 512 512", 512 * r, 512 * r * rb],
    'star': ["M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z", "0 0 576 512", 576 * r, 576 * r * rb],
    'cross': ["M310.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L160 210.7 54.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L114.7 256 9.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 301.3 265.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L205.3 256 310.6 150.6z", "0 0 320 512", 512 * r, 512 * r * rb],
}

colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']

for i, color in enumerate(colors):
    for shape, [d, viewBox, r1, r2] in shapes.items():
        print(shape, color)
        svg = gen_shape(viewBox, getColor(i), d, r1, r2)

        f = open("./assets/{0}_{1}.svg".format(color, shape), "w")
        f.write(svg)
        f.close()

f = open("./shape_colors.css", "w")

for color in colors:
    for shape in shapes.keys():
        s = '.cs-{0}-{1} {{\n'.format(color, shape)
        url = "./assets/{0}_{1}.svg".format(color, shape)
        s += '\tbackground-image: url({});\n'.format(url)
        s += '}\n\n'
        print(s)
        f.write(s)


f.close()
print('\n')
