---
title: Export a Structure
order: 2
---

<div align=center>
	<img width = "1920" height = "1080" src="/export/6.png"/>
</div>

## Export Your First Multiblock Structure

MMCR provides a highly convenient multiblock structure export feature. The `multiblock export tool` can reduce 95% of the work (not a statistical figure, but it really is convenient).

## Build a Multiblock Structure

Now, open a Minecraft instance with MMCR installed and take the `multiblock export tool` from MMCR's Creative tab.

Then build a multiblock structure however you like: import an existing build map, use Litematica to construct it quickly, or use any other structure you can think of. The example structure is shown below:

![Structure example](/export/1.png)

Note the white wool near the center: this is the preset position for the controller block. Since we have not formally registered a **machine definition**, we cannot simply obtain a controller block, so an otherwise unused block must stand in for it. Any block works. I do not recommend breaking it before export, as the exported position would become **air**.

Next, hold the `multiblock export tool` in your main hand and click a face of the white wool with the `middle mouse button`. That face is saved as the front of the structure, and a message appears in chat:

![](/export/2.png)

The tooltip for the `multiblock export tool` in your inventory also displays the information:

![](/export/3.png)

Then find two coordinates that form a cuboid covering the entire structure. **You do not actually need to find exact coordinates**; later, I will show you how to use advanced features of the `multiblock export tool` to reduce the mental overhead.

Find the two coordinates at the light-blue concrete positions shown below:

![](/export/4.png)

While holding the `multiblock export tool`, use `right-click` and `Shift+right-click` on the two blocks to mark them. Corresponding messages appear in chat:

![](/export/5.png)

You can then break these two blocks. **Be sure to remove unwanted blocks inside the structure (such as the light-blue concrete here), otherwise they will also be exported!**

After both marks are complete, the twelve edges of the selected area are highlighted in the world. While holding the `multiblock export tool`, `right-click` air to open its UI:

![](/export/6.png)

This UI displays the export settings in detail. You can fine-tune the two selected coordinates: `-` and `+` respectively decrease and increase a coordinate by 1, or you can enter a value directly in the input field (note: coordinates cannot be entered before any block is marked, as a defensive measure). This is why the earlier text said that **you do not actually need to find exact coordinates**: select a nearby point, then adjust it yourself.

Enable the `mask` option below to draw masks on the six faces of the selected area, helping you check whether any blocks were missed:

![](/export/7.png)

You can click `Clear Selection` to clear the selected controller and coordinates, or `Shift+right-click` air to clear them.

## Save the Exported Structure Code

You can export structure code in two formats, using either of two methods:

- Hold a `multiblock export tool` with the correct controller position and coordinate positions, then use `/mmcr export kjs` (exports KubeJS format) or `/mmcr export java` (exports Java format).
- `Right-click` to open the `multiblock export tool` UI, then click the button for the desired export format at the bottom.

Whichever format you choose, the structure is parsed and exported asynchronously (meaning it will not cause game lag at all; the export feature is highly performant, taking only 1.5 s to export a 1.4-million-block area without any lag). Chat displays the exported file's name and location:

![](/export/8.png)

Then open your `.minecraft` game directory, find the `mmcr_structure_export` directory, and open it to see the exported structure code:

![](/export/9.png)

=========I am a divider=========

![](/export/12.png)

Example export as a KubeJS structure:

![](/export/13.png)

Next, go to the relevant tutorial section for your chosen API:

[Jump to KubeJS edition](/en-us/getting-started/kubejs.md)

[Jump to Java API edition](/en-us/getting-started/java-api.md)
